import type { OwnerProfile } from "@/types";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, supabaseConfigStatus } from "@/lib/supabase";

const mockOwner: OwnerProfile = {
  id: "owner-1",
  email: "owner123@test.com",
  full_name: "Atlas Super Owner",
  role: "super_owner",
};

function logAuthStep(message: string, details?: unknown) {
  console.info(`[auth] ${message}`, details ?? "");
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
    email: String(row.email ?? ""),
    full_name: String(row.full_name ?? row.name ?? ""),
    role: row.role as OwnerProfile["role"],
  };
}

function mapAuthUserMetadata(user: User): OwnerProfile | null {
  const metadataRole = user.user_metadata?.role;
  if (typeof metadataRole !== "string") return null;

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: String(user.user_metadata?.full_name ?? ""),
    role: metadataRole as OwnerProfile["role"],
  };
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
      if (normalizedEmail === "owner123@test.com" && password === "Owner@123456") {
        localStorage.setItem("atlas-owner-session", JSON.stringify(mockOwner));
        logAuthStep("mock signIn succeeded", { email: normalizedEmail });
        return mockOwner;
      }
      throw new Error("Invalid mock credentials. Use owner123@test.com / Owner@123456.");
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
    });

    if (profile?.role !== "super_owner") {
      await supabase.auth.signOut();
      throw new Error(`Access denied. Expected role super_owner, received ${profile?.role ?? "no role"}.`);
    }

    return profile;
  },

  async signOut() {
    if (!isSupabaseConfigured) {
      localStorage.removeItem("atlas-owner-session");
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSessionProfile() {
    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem("atlas-owner-session");
      return raw ? (JSON.parse(raw) as OwnerProfile) : null;
    }

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
      return mockOwner;
    }

    logAuthStep("looking up role in profiles", { userId });
    const profileResult = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileResult.error) {
      console.warn("[auth] profiles role lookup failed", {
        message: profileResult.error.message,
        code: profileResult.error.code,
      });
    }

    if (profileResult.data?.role) {
      return mapProfileRow(profileResult.data as Record<string, unknown>);
    }

    logAuthStep("looking up role in users", { userId });
    const userResult = await supabase
      .from("users")
      .select("id, email, role")
      .eq("id", userId)
      .maybeSingle();

    if (userResult.error) {
      console.warn("[auth] users role lookup failed", {
        message: userResult.error.message,
        code: userResult.error.code,
      });
    }

    if (userResult.data?.role) {
      return mapProfileRow(userResult.data as Record<string, unknown>);
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

    throw new Error("Authenticated user has no role in public.profiles or public.users.");
  },
};
