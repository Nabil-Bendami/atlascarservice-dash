import type { OwnerProfile } from "@/types";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, supabaseConfigStatus } from "@/lib/supabase";

function logAuthStep(message: string, details?: unknown) {
  console.info(`[auth] ${message}`, details ?? "");
}

function normalizeRole(value: unknown): OwnerProfile["role"] {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "super_owner":
      return "super_owner";
    case "agency":
    case "agency_owner":
      return "agency";
    case "client":
      return "client";
    default:
      return "guest";
  }
}

function normalizeEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email || "";
}

function toAuthErrorMessage(error: unknown) {
  if (error instanceof AuthApiError) {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes("email logins are disabled")) {
      return "Supabase rejected login: Email logins are disabled. Enable Auth > Providers > Email in your Supabase dashboard.";
    }

    return `Supabase auth error (${error.status}${error.code ? `/${error.code}` : ""}): ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected authentication error.";
}

function mapProfileRow(row: Record<string, unknown>): OwnerProfile {
  return {
    id: String(row.id),
    email: normalizeEmail(row.email),
    full_name: String(row.full_name ?? row.name ?? ""),
    role: normalizeRole(row.role),
    agency_id: row.agency_id ? String(row.agency_id) : null,
  };
}

function mapAuthUserMetadata(user: User): OwnerProfile | null {
  const metadataRole = normalizeRole(user.user_metadata?.role);
  if (metadataRole === "guest") return null;

  return {
    id: user.id,
    email: normalizeEmail(user.email),
    full_name: String(user.user_metadata?.full_name ?? ""),
    role: metadataRole,
    agency_id: typeof user.user_metadata?.agency_id === "string" ? user.user_metadata.agency_id : null,
  };
}

function profileScore(profile: OwnerProfile | null) {
  if (!profile) return -1;

  let score = 0;
  if (profile.role !== "guest") score += 100;
  if (profile.agency_id) score += 25;
  if (profile.email) score += 10;
  if (profile.full_name) score += 5;
  return score;
}

function pickBestProfile(candidates: Array<OwnerProfile | null | undefined>) {
  return candidates.reduce<OwnerProfile | null>((best, candidate) => {
    if (!candidate) return best;
    if (!best) return candidate;
    return profileScore(candidate) > profileScore(best) ? candidate : best;
  }, null);
}

async function fetchRpcProfile() {
  logAuthStep("looking up profile via rpc:get_current_profile");
  const rpcResult = await supabase.rpc("get_current_profile");

  if (rpcResult.error) {
    console.warn("[auth] rpc get_current_profile failed", {
      message: rpcResult.error.message,
      code: rpcResult.error.code,
    });
    return null;
  }

  const rpcData =
    rpcResult.data && typeof rpcResult.data === "object" && !Array.isArray(rpcResult.data)
      ? (rpcResult.data as Record<string, unknown>)
      : null;

  if (!rpcData) return null;

  const profile = mapProfileRow(rpcData);
  return profile.role === "guest" && !profile.agency_id ? null : profile;
}

async function fetchTableProfileById(table: "profiles" | "users", userId: string) {
  logAuthStep(`looking up ${table} by auth user id`, { userId });
  const result = await supabase.from(table).select("*").eq("id", userId).maybeSingle();

  if (result.error) {
    console.warn(`[auth] ${table} lookup by id failed`, {
      message: result.error.message,
      code: result.error.code,
    });
    return null;
  }

  return result.data ? mapProfileRow(result.data as Record<string, unknown>) : null;
}

async function fetchTableProfilesByEmail(table: "profiles" | "users", email: string) {
  if (!email) return [];

  logAuthStep(`looking up ${table} by email`, { email });
  const result = await supabase.from(table).select("*").ilike("email", email).limit(5);

  if (result.error) {
    console.warn(`[auth] ${table} lookup by email failed`, {
      message: result.error.message,
      code: result.error.code,
    });
    return [];
  }

  return (result.data ?? []).map((row) => mapProfileRow(row as Record<string, unknown>));
}

async function fetchAgencyFallback(userId: string, email: string) {
  if (!email) return null;

  logAuthStep("looking up related agency by owner_user_id/email", { userId, email });
  const agencyByOwner = await supabase
    .from("agencies")
    .select("id, email, name")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (agencyByOwner.error) {
    console.warn("[auth] agencies lookup by owner_user_id failed", {
      message: agencyByOwner.error.message,
      code: agencyByOwner.error.code,
    });
  }

  const agencyByEmail = agencyByOwner.data
    ? null
    : await supabase
        .from("agencies")
        .select("id, email, name")
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (agencyByEmail?.error) {
    console.warn("[auth] agencies lookup by email failed", {
      message: agencyByEmail.error.message,
      code: agencyByEmail.error.code,
    });
  }

  const directAgency = agencyByOwner.data ?? agencyByEmail?.data ?? null;

  if (!directAgency) return null;

  return {
    id: userId,
    email: normalizeEmail(directAgency.email ?? email),
    full_name: String(directAgency.name ?? ""),
    role: "agency" as const,
    agency_id: String(directAgency.id),
  };
}

function getDefaultRedirectTarget(profile: OwnerProfile) {
  if (profile.role === "agency") return "/dashboard/agence";
  return "/dashboard";
}

export const authService = {
  async signIn(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    logAuthStep("signIn started", {
      email: normalizedEmail,
      isSupabaseConfigured,
      config: supabaseConfigStatus,
    });

    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      console.error("[auth] signInWithPassword failed", {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
      });
      throw new Error(toAuthErrorMessage(error));
    }

    if (!data.user) {
      throw new Error("Supabase did not return an authenticated user.");
    }

    logAuthStep("signInWithPassword succeeded", {
      userId: data.user.id,
      email: data.user.email,
    });

    const profile = await this.getCurrentProfile(data.user.id, data.user);
    logAuthStep("role lookup completed", {
      userId: data.user.id,
      role: profile?.role,
      email: profile?.email,
      agencyId: profile?.agency_id ?? null,
    });

    return profile;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSessionProfile() {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[auth] getSession failed", error);
      throw new Error(toAuthErrorMessage(error));
    }

    const user = data.session?.user;
    if (!user) return null;
    return this.getCurrentProfile(user.id, user);
  },

  async getCurrentProfile(userId: string, authUser?: User) {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Add environment variables to resolve the current profile.");
    }

    const normalizedEmail = normalizeEmail(authUser?.email);
    const rpcProfile = await fetchRpcProfile();
    if (rpcProfile) return rpcProfile;

    const [profileById, userById, profilesByEmail, usersByEmail, agencyFallback] = await Promise.all([
      fetchTableProfileById("profiles", userId),
      fetchTableProfileById("users", userId),
      fetchTableProfilesByEmail("profiles", normalizedEmail),
      fetchTableProfilesByEmail("users", normalizedEmail),
      fetchAgencyFallback(userId, normalizedEmail),
    ]);

    const resolvedProfile = pickBestProfile([
      profileById,
      userById,
      ...profilesByEmail,
      ...usersByEmail,
      agencyFallback,
    ]);

    if (resolvedProfile && resolvedProfile.role !== "guest") {
      return resolvedProfile;
    }

    if (authUser) {
      const metadataProfile = mapAuthUserMetadata(authUser);
      if (metadataProfile?.role) {
        console.warn("[auth] using auth metadata role fallback", {
          userId,
          role: metadataProfile.role,
        });
        return metadataProfile;
      }
    }

    throw new Error("Authenticated user exists but no public profile was found.");
  },

  getDefaultRedirectTarget,
};
