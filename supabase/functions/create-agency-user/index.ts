import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type CreateAgencyPayload = {
  email: string;
  password: string;
  agencyName: string;
  logo?: string;
  coverImage?: string;
  city?: string;
  cityId?: number | null;
  region?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: "active" | "suspended";
  verified?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePayload(payload: Partial<CreateAgencyPayload>) {
  if (!payload.email || !isValidEmail(payload.email)) {
    throw new Error("A valid email is required.");
  }

  if (!payload.password || payload.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!payload.agencyName || payload.agencyName.trim().length < 2) {
    throw new Error("Agency name is required.");
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[create-agency-user] request:start", {
      method: request.method,
      url: request.url,
      hasAuthorization: Boolean(request.headers.get("Authorization")),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("[create-agency-user] missing-env", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return jsonResponse(500, { error: "Missing Supabase environment variables." });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: request.headers.get("Authorization") ?? "",
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      console.error("[create-agency-user] auth:getUser failed", {
        authError,
        hasUser: Boolean(authData?.user),
      });
      return jsonResponse(401, { error: "Unauthorized." });
    }

    const ownerId = authData.user.id;
    let ownerRole: string | null = null;

    const profileQuery = await adminClient.from("profiles").select("role").eq("id", ownerId).maybeSingle();
    if (!profileQuery.error) {
      ownerRole = (profileQuery.data?.role as string | undefined) ?? ownerRole;
    }

    if (!ownerRole) {
      const userQuery = await adminClient.from("users").select("role").eq("id", ownerId).maybeSingle();
      if (!userQuery.error) {
        ownerRole = (userQuery.data?.role as string | undefined) ?? ownerRole;
      }
    }

    if (ownerRole !== "super_owner") {
      console.error("[create-agency-user] role-check failed", {
        ownerId,
        ownerRole,
      });
      return jsonResponse(403, { error: "Only super owners can create agency users." });
    }

    const payload = (await request.json()) as Partial<CreateAgencyPayload>;
    console.log("[create-agency-user] payload", {
      ...payload,
      password: payload.password ? `<redacted length=${payload.password.length}>` : undefined,
    });
    validatePayload(payload);

    let createdAuthUserId: string | null = null;
    let createdAgencyId: string | null = null;

    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: payload.email!,
      password: payload.password!,
      email_confirm: true,
      user_metadata: {
        role: "agency",
        agency_name: payload.agencyName,
      },
    });

    if (createAuthError || !createdAuth.user) {
      console.error("[create-agency-user] auth.admin.createUser failed", createAuthError);
      const duplicate = createAuthError?.message?.toLowerCase().includes("already");
      return jsonResponse(duplicate ? 409 : 400, {
        error: duplicate ? "An account already exists for this email." : createAuthError?.message ?? "Unable to create auth user.",
      });
    }

    createdAuthUserId = createdAuth.user.id;

    const agencyInsertPayload = {
      owner_user_id: createdAuthUserId,
      email: payload.email,
      name: payload.agencyName,
      logo_url: payload.logo ?? null,
      cover_url: payload.coverImage ?? null,
      city_id: payload.cityId ?? null,
      region: payload.region ?? null,
      address: payload.address ?? null,
      phone: payload.phone ?? null,
      whatsapp: payload.whatsapp ?? null,
      description: payload.description ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      status: payload.status ?? "active",
      is_blocked: false,
      is_verified: payload.verified ?? false,
    };

    const { data: agencyInsert, error: insertAgencyError } = await adminClient
      .from("agencies")
      .insert(agencyInsertPayload)
      .select("id")
      .single();

    console.log("[create-agency-user] agencies.insert response", {
      agencyInsert,
      insertAgencyError,
    });

    if (insertAgencyError || !agencyInsert) {
      throw insertAgencyError ?? new Error("Agency insert failed.");
    }

    createdAgencyId = agencyInsert.id as string;

    const { error: syncIdentityError } = await adminClient.rpc("sync_identity_role", {
      target_user_id: createdAuthUserId,
      target_email: payload.email,
      target_role: "agency",
      target_agency_id: createdAgencyId,
    });

    console.log("[create-agency-user] sync_identity_role response", {
      createdAgencyId,
      createdAuthUserId,
      syncIdentityError,
    });

    if (syncIdentityError) {
      throw syncIdentityError;
    }

    const { error: permissionsError } = await adminClient.from("agency_permissions").insert({
      agency_id: createdAgencyId,
    });

    console.log("[create-agency-user] agency_permissions.insert response", {
      createdAgencyId,
      permissionsError,
    });

    if (permissionsError) {
      throw permissionsError;
    }

    const { error: auditError } = await adminClient.from("admin_audit_logs").insert({
      owner_id: ownerId,
      action: "create_agency_user",
      target_type: "agency",
      target_id: createdAgencyId,
      details: {
        created_user_id: createdAuthUserId,
        email: payload.email,
        agency_name: payload.agencyName,
      },
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    console.log("[create-agency-user] admin_audit_logs.insert response", {
      createdAgencyId,
      auditError,
    });

    if (auditError) {
      throw auditError;
    }

    console.log("[create-agency-user] request:success", {
      createdAgencyId,
      createdAuthUserId,
      email: payload.email,
    });

    return jsonResponse(200, {
      agencyId: createdAgencyId,
      userId: createdAuthUserId,
      email: payload.email,
    });
  } catch (error) {
    console.error("[create-agency-user] request:failure", {
      error,
      stack: error instanceof Error ? error.stack : null,
    });
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const details = error instanceof Error ? error.message : "Unknown error";
      const requestBody = await request.text().then((text) => (text ? JSON.parse(text) : null)).catch(() => null);
      const email = requestBody?.email as string | undefined;

      if (email) {
        const existingAgency = await adminClient.from("agencies").select("id").eq("email", email).maybeSingle();
        if (!existingAgency.error && existingAgency.data?.id) {
          await adminClient.from("agency_permissions").delete().eq("agency_id", existingAgency.data.id);
          await adminClient.from("agencies").delete().eq("id", existingAgency.data.id);
        }
      }

      if (email) {
        const listUsers = await adminClient.auth.admin.listUsers();
        const matchedUser = listUsers.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
        if (matchedUser) {
          await adminClient.auth.admin.deleteUser(matchedUser.id);
        }
      }

      return jsonResponse(400, { error: details });
    }

    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
});
