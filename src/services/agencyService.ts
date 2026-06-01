import { mockAgencies, mockAgencyFromInput, mockCars, mockReservationHistory } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { SupabaseFunctionError, invokeSupabaseFunction } from "@/lib/supabaseFunctions";
import type { Agency, AgencyCreateInput, Car, ReservationHistoryItem } from "@/types";

const AGENCY_MEDIA_BUCKET = "agency-media";

function mapAgency(row: Record<string, unknown>): Agency {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    logo: String(row.logo ?? row.logo_url ?? ""),
    coverImage: String(row.cover_image ?? row.cover_url ?? ""),
    cityId: String(row.city_id ?? ""),
    cityName: String(row.city_name ?? ""),
    region: String(row.region ?? ""),
    address: String(row.address ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    description: String(row.description ?? ""),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    status: (row.status as Agency["status"]) ?? "active",
    isBlocked: Boolean(row.is_blocked ?? false),
    verified: Boolean(row.verified ?? row.is_verified ?? false),
    carsCount: Number(row.cars_count ?? 0),
    reservationsCount: Number(row.reservations_count ?? 0),
    estimatedRevenue: Number(row.estimated_revenue ?? 0),
    views: Number(row.views ?? 0),
    conversionRate: Number(row.conversion_rate ?? 0),
  };
}

function mapCar(row: Record<string, unknown>): Car {
  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    agencyName: String(row.agency_name ?? ""),
    cityId: String(row.city_id ?? ""),
    cityName: String(row.city_name ?? ""),
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    year: Number(row.year ?? 0),
    pricePerDay: Number(row.price_per_day ?? 0),
    availability: (row.availability as Car["availability"]) ?? "available",
    reservationsCount: Number(row.reservations_count ?? 0),
    totalRentedDays: Number(row.total_rented_days ?? 0),
    estimatedRevenue: Number(row.estimated_revenue ?? 0),
    views: Number(row.views ?? 0),
    whatsappClicks: Number(row.whatsapp_clicks ?? 0),
    phoneClicks: Number(row.phone_clicks ?? 0),
  };
}

type AgencyCreationResult = Agency & {
  creationMode?: "edge-function" | "direct-database";
};

function mapSupabaseErrorToAgencyMessage(error: unknown) {
  if (error instanceof SupabaseFunctionError) {
    return error.message;
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes("jwt") || lowerMessage.includes("unauthorized")) {
      return "Unauthorized access: sign in again before creating an agency.";
    }

    if (lowerMessage.includes("violates row-level security")) {
      return "Unauthorized access: your account does not have permission to create agencies.";
    }

    if (lowerMessage.includes("duplicate") || lowerMessage.includes("unique")) {
      return "Database insertion failed: an agency or city with the same unique value already exists.";
    }

    if (lowerMessage.includes("invalid input") || lowerMessage.includes("invalid")) {
      return "Invalid payload: Supabase rejected one or more agency fields.";
    }

    return error.message;
  }

  return "Unexpected error while creating the agency.";
}

async function resolveCityId(input: AgencyCreateInput) {
  if (typeof input.cityId === "number" && Number.isFinite(input.cityId)) {
    return input.cityId;
  }

  const normalizedCity = input.city.trim();

  console.log("[agency:create] resolveCityId:start", {
    city: normalizedCity,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const existingCityResult = await supabase.from("cities").select("id, name").ilike("name", normalizedCity).maybeSingle();
  console.log("[agency:create] resolveCityId:lookup-response", existingCityResult);

  if (existingCityResult.error) {
    console.error("[agency:create] resolveCityId:lookup-error", existingCityResult.error);
    return null;
  }

  if (existingCityResult.data?.id) {
    return Number(existingCityResult.data.id);
  }

  console.warn("[agency:create] resolveCityId:not-found", {
    city: normalizedCity,
    message: "No matching city row found. Agency will be inserted with city_id=null.",
  });
  return null;
}

async function uploadAgencyImage(file: File, assetType: "logo" | "cover") {
  console.log("[agency:create] upload:start", {
    bucket: AGENCY_MEDIA_BUCKET,
    assetType,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });

  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const fileExt = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
  const filePath = `${assetType}/${crypto.randomUUID()}.${fileExt ?? "jpg"}`;
  const uploadResult = await supabase.storage.from(AGENCY_MEDIA_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  console.log("[agency:create] upload:storage-response", {
    assetType,
    filePath,
    uploadResult,
  });

  if (uploadResult.error) {
    console.error("[agency:create] upload:error", {
      assetType,
      error: uploadResult.error,
    });
    throw new Error(`Failed to upload ${assetType} image: ${uploadResult.error.message}`);
  }

  const publicUrlResult = supabase.storage.from(AGENCY_MEDIA_BUCKET).getPublicUrl(filePath);
  const publicUrl = publicUrlResult.data.publicUrl;

  console.log("[agency:create] upload:public-url", {
    assetType,
    filePath,
    publicUrl,
  });

  if (!publicUrl) {
    throw new Error(`Failed to resolve public URL for ${assetType} image.`);
  }

  return publicUrl;
}

async function insertAgencyDirectly(input: AgencyCreateInput): Promise<AgencyCreationResult> {
  console.warn("[agency:create] Edge Function unavailable, using direct database insert fallback.");

  const userResult = await supabase.auth.getUser();
  console.log("[agency:create] direct-insert:user-response", {
    userId: userResult.data.user?.id ?? null,
    error: userResult.error,
  });

  if (userResult.error || !userResult.data.user) {
    throw new Error("Unauthorized access: no authenticated user is available for direct agency creation.");
  }

  const cityId = await resolveCityId(input);
    const insertPayload = {
    owner_user_id: null,
    email: input.email,
    name: input.agencyName,
      city_id: cityId,
      region: input.region,
      address: input.address,
      phone: input.phone,
      whatsapp: input.whatsapp,
      description: input.description ?? null,
    status: input.status,
    is_blocked: false,
    is_verified: input.verified,
    logo_url: input.logo,
    cover_url: input.coverImage,
    latitude: input.latitude,
    longitude: input.longitude,
  };

  console.log("[agency:create] direct-insert:payload", insertPayload);

  const insertResult = await supabase.from("agencies").insert(insertPayload).select("*").single();
  console.log("[agency:create] direct-insert:agency-response", insertResult);

  if (insertResult.error || !insertResult.data) {
    console.error("[agency:create] direct-insert:agency-error", {
      error: insertResult.error,
      stack: insertResult.error?.stack,
    });
    throw new Error(mapSupabaseErrorToAgencyMessage(insertResult.error));
  }

  const permissionsResult = await supabase.from("agency_permissions").insert({
    agency_id: insertResult.data.id,
  });
  console.log("[agency:create] direct-insert:permissions-response", permissionsResult);

  if (permissionsResult.error) {
    console.error("[agency:create] direct-insert:permissions-error", {
      error: permissionsResult.error,
      stack: permissionsResult.error.stack,
    });
    throw new Error(`Database insertion failed: ${permissionsResult.error.message}`);
  }

  const auditResult = await supabase.from("admin_audit_logs").insert({
    owner_id: userResult.data.user.id,
    action: "create_agency",
    target_type: "agency",
    target_id: insertResult.data.id,
    details: {
      email: input.email,
      agency_name: input.agencyName,
      creation_mode: "direct-database",
      auth_user_provisioned: false,
    },
  });
  console.log("[agency:create] direct-insert:audit-response", auditResult);

  if (auditResult.error) {
    console.error("[agency:create] direct-insert:audit-error", {
      error: auditResult.error,
      stack: auditResult.error.stack,
    });
    throw new Error(`Database insertion failed: ${auditResult.error.message}`);
  }

  const createdAgency = await supabase.from("owner_agencies_view").select("*").eq("id", insertResult.data.id).single();
  console.log("[agency:create] direct-insert:view-response", createdAgency);

  if (createdAgency.error || !createdAgency.data) {
    console.error("[agency:create] direct-insert:view-error", {
      error: createdAgency.error,
      stack: createdAgency.error?.stack,
    });
    throw new Error("Agency was inserted, but the refreshed agency view could not be loaded.");
  }

  return {
    ...mapAgency(createdAgency.data as Record<string, unknown>),
    creationMode: "direct-database",
  };
}

export const agencyService = {
  async listAgencies(cityId?: string) {
    if (!isSupabaseConfigured) {
      return cityId ? mockAgencies.filter((agency) => agency.cityId === cityId) : mockAgencies;
    }

    let query = supabase.from("owner_agencies_view").select("*").order("name");
    if (cityId) {
      query = query.eq("city_id", Number(cityId));
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => mapAgency(row as Record<string, unknown>));
  },

  async getAgencyById(agencyId: string) {
    if (!isSupabaseConfigured) {
      return mockAgencies.find((agency) => agency.id === agencyId) ?? null;
    }

    const { data, error } = await supabase.from("owner_agencies_view").select("*").eq("id", agencyId).single();
    if (error) throw error;
    return mapAgency(data as Record<string, unknown>);
  },

  async getAgencyCars(agencyId: string) {
    if (!isSupabaseConfigured) {
      return mockCars.filter((car) => car.agencyId === agencyId);
    }

    const { data, error } = await supabase.from("owner_cars_view").select("*").eq("agency_id", agencyId);
    if (error) throw error;
    return (data ?? []).map((row) => mapCar(row as Record<string, unknown>));
  },

  async createAgencyWithAuth(input: AgencyCreateInput): Promise<AgencyCreationResult> {
    if (!isSupabaseConfigured) {
      return mockAgencyFromInput(input);
    }

    try {
      const data = await invokeSupabaseFunction<AgencyCreateInput, { agencyId: string }>("create-agency-user", input);
      const createdAgency = await this.getAgencyById(String(data.agencyId));

      if (!createdAgency) {
        throw new Error("Agency was created but could not be loaded from owner_agencies_view.");
      }

      return {
        ...createdAgency,
        creationMode: "edge-function",
      };
    } catch (error) {
      console.error("[agency:create] edge-function-error", {
        error,
        stack: error instanceof Error ? error.stack : null,
      });

      if (
        error instanceof SupabaseFunctionError &&
        (error.code === "NOT_FOUND" || error.code === "NETWORK_ERROR")
      ) {
        console.warn("[agency:create] edge-function-fallback", {
          reason: error.code,
          message: error.message,
          payload: {
            ...input,
            password: `<redacted length=${input.password.length}>`,
          },
        });
        return insertAgencyDirectly(input);
      }

      throw new Error(mapSupabaseErrorToAgencyMessage(error));
    }
  },

  async uploadAgencyImage(file: File, assetType: "logo" | "cover") {
    return uploadAgencyImage(file, assetType);
  },

  async setAgencyBlockedState(agencyId: string, isBlocked: boolean) {
    console.log("[agency:block-toggle] start", {
      agencyId,
      isBlocked,
    });

    const updateResult = await supabase
      .from("agencies")
      .update({ is_blocked: isBlocked })
      .eq("id", agencyId)
      .select("*")
      .single();

    console.log("[agency:block-toggle] agencies.update response", updateResult);

    if (updateResult.error || !updateResult.data) {
      console.error("[agency:block-toggle] agencies.update error", {
        error: updateResult.error,
        stack: updateResult.error?.stack,
      });
      throw new Error(updateResult.error?.message ?? "Failed to update agency block status.");
    }

    const userResult = await supabase.auth.getUser();
    console.log("[agency:block-toggle] auth.getUser response", {
      userId: userResult.data.user?.id ?? null,
      error: userResult.error,
    });

    if (userResult.data.user?.id) {
      const auditResult = await supabase.from("admin_audit_logs").insert({
        owner_id: userResult.data.user.id,
        action: isBlocked ? "block_agency" : "unblock_agency",
        target_type: "agency",
        target_id: agencyId,
        details: {
          is_blocked: isBlocked,
        },
      });

      console.log("[agency:block-toggle] admin_audit_logs.insert response", auditResult);

      if (auditResult.error) {
        console.error("[agency:block-toggle] admin_audit_logs.insert error", {
          error: auditResult.error,
          stack: auditResult.error.stack,
        });
      }
    }

    const refreshedAgency = await this.getAgencyById(agencyId);
    if (!refreshedAgency) {
      throw new Error("Agency block status was updated, but the refreshed agency data could not be loaded.");
    }

    return refreshedAgency;
  },

  async getAgencyReservations(agencyId: string) {
    if (!isSupabaseConfigured) {
      return mockReservationHistory.map((reservation, index) => ({
        ...reservation,
        id: `${agencyId}-${index + 1}`,
      }));
    }

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("agency_id", agencyId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return data as ReservationHistoryItem[];
  },
};
