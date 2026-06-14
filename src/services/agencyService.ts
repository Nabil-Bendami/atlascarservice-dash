import { mockAgencies, mockAgencyFromInput, mockCars, mockReservationHistory } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import type { Agency, AgencyCreateInput, AgencyDocument, AgencyTrafficStats, Car, OwnerReview, ReservationHistoryItem } from "@/types";

const AGENCY_MEDIA_BUCKET = "agency-media";

function queryErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message ?? "Unknown error");
  return "Unknown error";
}

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

function mapAgencyDocument(row: Record<string, unknown>, signedUrl?: string | null): AgencyDocument {
  const fileUrl = String(signedUrl ?? row.file_url ?? row.document_url ?? row.url ?? row.public_url ?? "");
  const storagePath =
    typeof row.storage_path === "string" && row.storage_path.trim()
      ? row.storage_path.trim()
      : typeof row.file_path === "string" && row.file_path.trim()
        ? row.file_path.trim()
        : typeof row.path === "string" && row.path.trim()
          ? row.path.trim()
          : null;
  const storageBucket =
    typeof row.storage_bucket === "string" && row.storage_bucket.trim()
      ? row.storage_bucket.trim()
      : typeof row.bucket_name === "string" && row.bucket_name.trim()
        ? row.bucket_name.trim()
        : typeof row.bucket === "string" && row.bucket.trim()
          ? row.bucket.trim()
          : null;
  const fallbackName =
    String(row.file_name ?? row.filename ?? "").trim() ||
    (storagePath ? storagePath.split("/").pop() || "" : "") ||
    (fileUrl ? fileUrl.split("/").pop() || "" : "") ||
    "Document";

  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    documentName: String(row.document_name ?? row.name ?? row.title ?? fallbackName),
    documentType: String(row.document_type ?? row.file_type ?? "Autre"),
    fileName: fallbackName,
    fileUrl,
    status: String(row.status ?? "pending"),
    createdAt: String(row.uploaded_at ?? row.created_at ?? ""),
    storageBucket,
    storagePath,
    raw: row,
  };
}

function logAgencyDocumentShape(row: Record<string, unknown>) {
  console.log("AGENCY_DOCUMENTS_UPLOAD", row);
  console.log("AGENCY_DOCUMENTS_UPLOAD_FIELDS", {
    id: row.id ?? null,
    agency_id: row.agency_id ?? null,
    file_name: row.file_name ?? row.filename ?? row.document_name ?? row.name ?? row.title ?? null,
    file_url: row.file_url ?? null,
    document_url: row.document_url ?? null,
    storage_path: row.storage_path ?? row.file_path ?? null,
    storage_bucket: row.storage_bucket ?? row.bucket_name ?? null,
    created_at: row.created_at ?? row.uploaded_at ?? null,
  });
}

function mapAgencyReview(row: Record<string, unknown>): OwnerReview {
  return {
    id: String(row.id),
    rating: Number(row.rating ?? 0),
    comment: String(row.comment ?? ""),
    targetType: String(row.target_type ?? "agency"),
    agencyId: row.agency_id ? String(row.agency_id) : null,
    agencyName: null,
    status: String(row.status ?? "published"),
    createdAt: String(row.created_at ?? ""),
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

    if (!agencyId) return null;

    const { data, error } = await supabase.from("owner_agencies_view").select("*").eq("id", agencyId).maybeSingle();
    console.log("AGENCY_QUERY", data);
    console.log("OWNER_AGENCY_DATA", data);

    if (error) {
      console.error("AGENCY_QUERY_ERROR", error);
      console.error("OWNER_AGENCY_DETAILS_ERROR", error);
      console.error("AGENCY_ID", agencyId);
      throw new Error(`Failed to load agency profile: ${queryErrorMessage(error)}`);
    }

    return data ? mapAgency(data as Record<string, unknown>) : null;
  },

  async getAgencyCars(agencyId: string) {
    if (!isSupabaseConfigured) {
      return mockCars.filter((car) => car.agencyId === agencyId);
    }

    if (!agencyId) return [];

    const { data, error } = await supabase.from("owner_cars_view").select("*").eq("agency_id", agencyId);
    console.log("CARS_QUERY", data);
    if (error) {
      console.error("CARS_QUERY_ERROR", error);
      console.error("OWNER_AGENCY_DETAILS_ERROR", error);
      console.error("AGENCY_ID", agencyId);
      throw new Error(`Failed to load agency vehicles: ${queryErrorMessage(error)}`);
    }
    return (data ?? []).map((row) => mapCar(row as Record<string, unknown>));
  },

  async getAgencyDocuments(agencyId: string) {
    if (!isSupabaseConfigured) {
      return [] satisfies AgencyDocument[];
    }

    if (!agencyId) return [];

    console.log("AGENCY_ID", agencyId);

    const { data, error } = await supabase
      .from("agency_documents")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    console.log("DOCUMENTS_QUERY", data);
    console.log("AGENCY_DOCUMENTS_QUERY", data);

    if (error) {
      console.error("DOCUMENTS_QUERY_ERROR", error);
      console.error("DOCUMENTS_QUERY_ERROR_FULL", JSON.stringify(error, null, 2));
      console.error("OWNER_AGENCY_DETAILS_ERROR", error);
      console.error("AGENCY_ID", agencyId);
      throw new Error(`Failed to load agency documents: ${queryErrorMessage(error)}`);
    }

    const tableRows = (data ?? []) as Record<string, unknown>[];
    const documents = tableRows.map((row) => {
      logAgencyDocumentShape(row);
      return mapAgencyDocument(row);
    });
    console.log("OWNER_AGENCY_DOCUMENTS", documents);
    console.log("AGENCY_DOCUMENTS_QUERY", documents);
    return documents;
  },

  async getAgencyReviews(agencyId: string) {
    if (!isSupabaseConfigured) return [] satisfies OwnerReview[];
    if (!agencyId) return [];

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    console.log("REVIEWS_QUERY", data);

    if (error) {
      console.error("REVIEWS_QUERY_ERROR", error);
      console.error("OWNER_AGENCY_DETAILS_ERROR", error);
      console.error("AGENCY_ID", agencyId);
      throw new Error(`Failed to load reviews: ${queryErrorMessage(error)}`);
    }

    return (data ?? []).map((row) => mapAgencyReview(row as Record<string, unknown>));
  },

  async getAgencyTrafficStats(agencyId: string): Promise<AgencyTrafficStats> {
    if (!isSupabaseConfigured || !agencyId) {
      return { totalEvents: 0 };
    }

    const { count, error } = await supabase
      .from("traffic_events")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId);

    console.log("TRAFFIC_QUERY", { totalEvents: count ?? 0 });

    if (error) {
      console.error("TRAFFIC_QUERY_ERROR", error);
      console.error("OWNER_AGENCY_DETAILS_ERROR", error);
      console.error("AGENCY_ID", agencyId);
      throw new Error(`Failed to load traffic analytics: ${queryErrorMessage(error)}`);
    }

    return { totalEvents: count ?? 0 };
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

    if (!agencyId) return [];

    const { data, error } = await supabase
      .from("reservations")
      .select("*, cars(*)")
      .eq("agency_id", agencyId)
      .eq("status", "verified")
      .order("created_at", { ascending: false });

    console.log("RESERVATIONS_QUERY", data);

    if (error) {
      console.error("RESERVATIONS_QUERY_ERROR", error);
      console.error("OWNER_AGENCY_DETAILS_ERROR", error);
      console.error("AGENCY_ID", agencyId);
      console.error("AGENCY_RESERVATIONS_FETCH_ERROR", {
        agencyId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to load reservations: ${queryErrorMessage(error)}`);
    }

    console.log("AGENCY_RESERVATIONS_FETCH_RESPONSE", {
      agencyId,
      count: data?.length ?? 0,
      rows: data ?? [],
    });

    return (data ?? []).map((row) => {
      const record = row as Record<string, any>;
      const car = record.cars as Record<string, unknown> | null;
      const startDate = String(record.start_date ?? "");
      const endDate = String(record.end_date ?? "");
      const days =
        Number(record.total_days ?? 0) ||
        Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000));
      const fallbackCarName = [car?.brand, car?.model].filter(Boolean).join(" ") || String(record.car_id ?? "");
      const carName = String(car?.name ?? fallbackCarName);

      return {
        id: String(record.id),
        customerName: String(record.client_name ?? "Client"),
        customerPhone: String(record.client_phone ?? ""),
        city: String(record.city ?? ""),
        carName,
        startDate,
        endDate,
        days,
        total: Number(record.total_price ?? record.total_amount ?? 0),
        status: "verified",
        message: String(record.message ?? ""),
      } satisfies ReservationHistoryItem;
    });
  },
};
