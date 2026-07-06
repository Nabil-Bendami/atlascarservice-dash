import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type AgencyPayload = {
  name?: string;
  agencyName?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  whatsapp?: string | null;
  city_id?: number | string | null;
  cityId?: number | string | null;
  region_id?: number | string | null;
  regionId?: number | string | null;
  region?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  logo_url?: string | null;
  logo?: string | null;
  cover_url?: string | null;
  coverImage?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  verified?: boolean | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeAgencyName(payload: AgencyPayload) {
  return (payload.name ?? payload.agencyName ?? "").trim();
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("could not find the table");
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST204" || message.includes("column") || message.includes("schema cache");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePayload(payload: AgencyPayload) {
  const name = normalizeAgencyName(payload);
  const email = payload.email ? normalizeEmail(payload.email) : "";
  const password = payload.password ?? "";

  if (!name) {
    throw new Error("Agency name is required.");
  }

  if (!email || !isValidEmail(email)) {
    throw new Error("A valid email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asNullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

async function tableExists(adminClient: ReturnType<typeof createClient>, tableName: string) {
  const { error } = await adminClient.from(tableName).select("*").limit(1);
  return !isMissingTableError(error);
}

async function columnExists(adminClient: ReturnType<typeof createClient>, tableName: string, columnName: string) {
  const { error } = await adminClient.from(tableName).select(columnName).limit(1);
  if (!error) return true;
  if (isMissingTableError(error) || isMissingColumnError(error)) return false;
  throw error;
}

async function resolveOwnerRole(adminClient: ReturnType<typeof createClient>, ownerId: string) {
  const profilesExists = await tableExists(adminClient, "profiles");
  if (profilesExists) {
    const profileResult = await adminClient.from("profiles").select("role").eq("id", ownerId).maybeSingle();
    if (profileResult.error && !isMissingTableError(profileResult.error) && !isMissingColumnError(profileResult.error)) {
      throw profileResult.error;
    }
    if (profileResult.data?.role) return String(profileResult.data.role);
  }

  const usersExists = await tableExists(adminClient, "users");
  if (usersExists) {
    const userResult = await adminClient.from("users").select("role").eq("id", ownerId).maybeSingle();
    if (userResult.error && !isMissingTableError(userResult.error) && !isMissingColumnError(userResult.error)) {
      throw userResult.error;
    }
    if (userResult.data?.role) return String(userResult.data.role);
  }

  return null;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      error: "Missing required Supabase secrets.",
      required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let createdUserId: string | null = null;
  let createdAgencyId: string | null = null;
  let createdPermissions = false;

  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

    if (!accessToken) {
      return jsonResponse(401, { error: "Missing Authorization bearer token." });
    }

    const { data: ownerAuth, error: ownerAuthError } = await supabaseAdmin.auth.getUser(accessToken);
    if (ownerAuthError || !ownerAuth.user) {
      return jsonResponse(401, {
        error: "Unauthorized.",
        details: ownerAuthError?.message ?? "Unable to resolve the calling user.",
      });
    }

    const ownerRole = await resolveOwnerRole(supabaseAdmin, ownerAuth.user.id);
    if (ownerRole !== "super_owner") {
      return jsonResponse(403, {
        error: "Only super owners can create agency users.",
        details: {
          ownerId: ownerAuth.user.id,
          ownerRole,
        },
      });
    }

    const payload = (await request.json()) as AgencyPayload;
    validatePayload(payload);

    const agencyName = normalizeAgencyName(payload);
    const email = normalizeEmail(payload.email!);
    const password = payload.password!;
    const phone = asNullableString(payload.phone);
    const whatsapp = asNullableString(payload.whatsapp);
    const cityId = asNullableNumber(payload.city_id ?? payload.cityId);
    const regionId = asNullableNumber(payload.region_id ?? payload.regionId);
    const region = asNullableString(payload.region);
    const address = asNullableString(payload.address);
    const latitude = asNullableNumber(payload.latitude);
    const longitude = asNullableNumber(payload.longitude);
    const description = asNullableString(payload.description);
    const logoUrl = asNullableString(payload.logo_url ?? payload.logo);
    const coverUrl = asNullableString(payload.cover_url ?? payload.coverImage);
    const status = asNullableString(payload.status) ?? "active";
    const isVerified = asNullableBoolean(payload.is_verified ?? payload.verified) ?? true;
    const isSuspended = status.toLowerCase() === "suspended";

    const createUserResult = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "agency",
      },
    });

    if (createUserResult.error || !createUserResult.data.user) {
      return jsonResponse(400, {
        error: "Unable to create auth user.",
        details: createUserResult.error?.message ?? null,
      });
    }

    createdUserId = createUserResult.data.user.id;

    const hasAgencyRegionId = await columnExists(supabaseAdmin, "agencies", "region_id");
    const hasAgencyRegion = await columnExists(supabaseAdmin, "agencies", "region");

    const agencyInsertPayload: Record<string, unknown> = {
      owner_user_id: createdUserId,
      name: agencyName,
      email,
      phone,
      whatsapp,
      city_id: cityId,
      address,
      latitude,
      longitude,
      description,
      logo_url: logoUrl,
      cover_url: coverUrl,
      status,
      is_verified: isVerified,
      is_blocked: isSuspended,
      is_suspended: isSuspended,
    };

    if (hasAgencyRegionId) {
      agencyInsertPayload.region_id = regionId;
    }

    if (hasAgencyRegion) {
      agencyInsertPayload.region = region;
    }

    const agencyInsertResult = await supabaseAdmin
      .from("agencies")
      .insert(agencyInsertPayload)
      .select("id")
      .single();

    if (agencyInsertResult.error || !agencyInsertResult.data?.id) {
      throw new Error(agencyInsertResult.error?.message ?? "Unable to create agency row.");
    }

    createdAgencyId = String(agencyInsertResult.data.id);

    const metadataUpdate = await supabaseAdmin.auth.admin.updateUserById(createdUserId, {
      user_metadata: {
        role: "agency",
        agency_id: createdAgencyId,
      },
    });

    if (metadataUpdate.error) {
      throw new Error(metadataUpdate.error.message);
    }

    const profilesExists = await tableExists(supabaseAdmin, "profiles");
    if (profilesExists) {
      const hasProfilesFullName = await columnExists(supabaseAdmin, "profiles", "full_name");
      const profilePayload: Record<string, unknown> = {
        id: createdUserId,
        email,
        role: "agency",
        agency_id: createdAgencyId,
      };

      if (hasProfilesFullName) {
        profilePayload.full_name = agencyName;
      }

      const profilesUpsert = await supabaseAdmin.from("profiles").upsert(profilePayload, { onConflict: "id" });
      if (profilesUpsert.error) {
        throw new Error(`Unable to create/update public.profiles: ${profilesUpsert.error.message}`);
      }
    }

    const usersExists = await tableExists(supabaseAdmin, "users");
    if (usersExists) {
      const usersUpsert = await supabaseAdmin.from("users").upsert(
        {
          id: createdUserId,
          email,
          role: "agency",
          agency_id: createdAgencyId,
        },
        { onConflict: "id" },
      );

      if (usersUpsert.error) {
        throw new Error(`Unable to create/update public.users: ${usersUpsert.error.message}`);
      }
    }

    const agencyPermissionsExists = await tableExists(supabaseAdmin, "agency_permissions");
    if (agencyPermissionsExists) {
      const agencyPermissionsUpsert = await supabaseAdmin.from("agency_permissions").upsert(
        {
          agency_id: createdAgencyId,
        },
        { onConflict: "agency_id" },
      );

      if (agencyPermissionsUpsert.error) {
        throw new Error(`Unable to create/update agency_permissions: ${agencyPermissionsUpsert.error.message}`);
      }

      createdPermissions = true;
    }

    return jsonResponse(200, {
      userId: createdUserId,
      agencyId: createdAgencyId,
      email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";

    if (createdPermissions && createdAgencyId) {
      await supabaseAdmin.from("agency_permissions").delete().eq("agency_id", createdAgencyId);
    }

    if (createdAgencyId) {
      await supabaseAdmin.from("agencies").delete().eq("id", createdAgencyId);
    }

    if (createdUserId) {
      await supabaseAdmin.from("profiles").delete().eq("id", createdUserId);
      await supabaseAdmin.from("users").delete().eq("id", createdUserId);
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }

    return jsonResponse(400, {
      error: message,
      details: {
        createdUserId,
        createdAgencyId,
      },
    });
  }
});
