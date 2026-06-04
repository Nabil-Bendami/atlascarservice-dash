import { mockAgencies, mockAgencyFromInput, mockCars, mockReservationHistory } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
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

async function getFunctionErrorMessage(error: FunctionsFetchError | FunctionsHttpError | FunctionsRelayError | Error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const responseBody = await error.context.json();
      const message =
        typeof responseBody?.error === "string"
          ? responseBody.error
          : typeof responseBody?.message === "string"
            ? responseBody.message
            : error.message;
      return message;
    } catch {
      return error.message;
    }
  }

  return error.message;
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
      const { data, error } = await supabase.functions.invoke<{ agencyId: string; userId: string; email: string }>(
        "create-agency-user",
        {
          body: input,
        },
      );

      if (error) {
        throw error;
      }

      if (!data?.agencyId) {
        throw new Error("Agency provisioning succeeded but did not return an agency id.");
      }

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

      if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
        console.error("[agency:create] edge-function-required", {
          reason: error.name,
          message: error.message,
          payload: {
            ...input,
            password: `<redacted length=${input.password.length}>`,
          },
        });
        throw new Error(
          "Agency auth provisioning is unavailable because the Supabase Edge Function \"create-agency-user\" is missing or unreachable. Deploy the function and retry. Direct database fallback has been disabled to prevent orphaned agency accounts.",
        );
      }

      if (error instanceof FunctionsHttpError || error instanceof Error) {
        throw new Error(await getFunctionErrorMessage(error));
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
