import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type ProfileResponse = {
  id: string;
  email: string | null;
  role: "agency";
  agency_id: string;
};

function jsonResponse(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders,
    },
  });
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function isAgencyProfile(row: { id?: string | null; email?: string | null; role?: string | null; agency_id?: string | null } | null): row is {
  id: string;
  email?: string | null;
  role: "agency";
  agency_id: string;
} {
  return Boolean(row?.id && row.role === "agency" && row.agency_id);
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST" && request.method !== "GET") {
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

  const authHeader = request.headers.get("Authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!accessToken) {
    return jsonResponse(401, { error: "Missing Authorization bearer token." });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return jsonResponse(401, {
        error: "Invalid or expired access token.",
        details: authError?.message ?? null,
      });
    }

    const userId = authData.user.id;
    const email = normalizeEmail(authData.user.email);

    const { data: userById, error: userByIdError } = await supabaseAdmin
      .from("users")
      .select("id, email, role, agency_id")
      .eq("id", userId)
      .maybeSingle();

    if (userByIdError) {
      return jsonResponse(500, {
        error: "Unable to query public.users by id.",
        details: userByIdError.message,
      });
    }

    if (isAgencyProfile(userById)) {
      const profile: ProfileResponse = {
        id: userById.id,
        email: normalizeEmail(userById.email),
        role: "agency",
        agency_id: userById.agency_id,
      };

      return jsonResponse(200, { profile });
    }

    if (email) {
      const { data: userByEmail, error: userByEmailError } = await supabaseAdmin
        .from("users")
        .select("id, email, role, agency_id")
        .eq("email", email)
        .maybeSingle();

      if (userByEmailError) {
        return jsonResponse(500, {
          error: "Unable to query public.users by email.",
          details: userByEmailError.message,
        });
      }

      if (isAgencyProfile(userByEmail)) {
        const profile: ProfileResponse = {
          id: userByEmail.id,
          email: normalizeEmail(userByEmail.email),
          role: "agency",
          agency_id: userByEmail.agency_id,
        };

        return jsonResponse(200, { profile });
      }
    }

    const { data: agencyByOwner, error: agencyByOwnerError } = await supabaseAdmin
      .from("agencies")
      .select("id, email, owner_user_id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (agencyByOwnerError) {
      return jsonResponse(500, {
        error: "Unable to query public.agencies by owner_user_id.",
        details: agencyByOwnerError.message,
      });
    }

    if (agencyByOwner?.id) {
      const profile: ProfileResponse = {
        id: agencyByOwner.owner_user_id ?? userId,
        email: normalizeEmail(agencyByOwner.email) ?? email,
        role: "agency",
        agency_id: String(agencyByOwner.id),
      };

      return jsonResponse(200, { profile });
    }

    if (email) {
      const { data: agencyByEmail, error: agencyByEmailError } = await supabaseAdmin
        .from("agencies")
        .select("id, email, owner_user_id")
        .eq("email", email)
        .maybeSingle();

      if (agencyByEmailError) {
        return jsonResponse(500, {
          error: "Unable to query public.agencies by email.",
          details: agencyByEmailError.message,
        });
      }

      if (agencyByEmail?.id) {
        const profile: ProfileResponse = {
          id: agencyByEmail.owner_user_id ?? userId,
          email: normalizeEmail(agencyByEmail.email) ?? email,
          role: "agency",
          agency_id: String(agencyByEmail.id),
        };

        return jsonResponse(200, { profile });
      }
    }

    return jsonResponse(404, {
      error: "Agency profile not found.",
      details: {
        userId,
        email,
        checked: ["public.users by id/email", "public.agencies by owner_user_id/email"],
      },
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Unexpected get-agency-profile error.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
