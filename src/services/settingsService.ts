import { authService } from "@/services/authService";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { OwnerApiToken, OwnerProfile, OwnerSettings } from "@/types";

const SETTINGS_STORAGE_KEY = "atlas-owner-settings";
const LAST_SETTINGS_STORAGE_KEY = "atlas-owner-settings:last";
const TOKENS_STORAGE_KEY = "atlas-owner-api-tokens";

const defaultAccent = "#5B5FEF";

function defaultSettings(profile: OwnerProfile): OwnerSettings {
  return {
    ownerId: profile.id,
    profile: {
      fullName: profile.full_name || "Super Owner",
      email: profile.email,
    },
    workspace: {
      workspaceName: "Atlas Owner Dashboard",
      companyName: "Atlas Drive",
      companyWebsite: "https://atlas.example",
    },
    appearance: {
      darkMode: false,
      accentColor: defaultAccent,
      reduceMotion: false,
      compactLayout: false,
    },
    notifications: {
      emailNotifications: true,
      importNotifications: true,
      securityNotifications: true,
    },
  };
}

function getSettingsStorageKey(ownerId: string) {
  return `${SETTINGS_STORAGE_KEY}:${ownerId}`;
}

function getTokensStorageKey(ownerId: string) {
  return `${TOKENS_STORAGE_KEY}:${ownerId}`;
}

function readCachedSettings(ownerId: string) {
  const cached = localStorage.getItem(getSettingsStorageKey(ownerId)) ?? localStorage.getItem(LAST_SETTINGS_STORAGE_KEY);
  return cached ? (JSON.parse(cached) as OwnerSettings) : null;
}

function writeCachedSettings(settings: OwnerSettings) {
  localStorage.setItem(getSettingsStorageKey(settings.ownerId), JSON.stringify(settings));
  localStorage.setItem(LAST_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function readCachedTokens(ownerId: string) {
  const cached = localStorage.getItem(getTokensStorageKey(ownerId));
  return cached ? (JSON.parse(cached) as OwnerApiToken[]) : [];
}

function writeCachedTokens(ownerId: string, tokens: OwnerApiToken[]) {
  localStorage.setItem(getTokensStorageKey(ownerId), JSON.stringify(tokens));
}

function mapSettingsRow(row: Record<string, unknown>, profile: OwnerProfile): OwnerSettings {
  const defaults = defaultSettings(profile);
  return {
    ownerId: String(row.owner_id ?? profile.id),
    profile: {
      fullName: String(row.full_name ?? defaults.profile.fullName),
      email: profile.email,
    },
    workspace: {
      workspaceName: String(row.workspace_name ?? defaults.workspace.workspaceName),
      companyName: String(row.company_name ?? defaults.workspace.companyName),
      companyWebsite: String(row.company_website ?? defaults.workspace.companyWebsite),
    },
    appearance: {
      darkMode: Boolean(row.dark_mode ?? defaults.appearance.darkMode),
      accentColor: String(row.accent_color ?? defaults.appearance.accentColor),
      reduceMotion: Boolean(row.reduce_motion ?? defaults.appearance.reduceMotion),
      compactLayout: Boolean(row.compact_layout ?? defaults.appearance.compactLayout),
    },
    notifications: {
      emailNotifications: Boolean(row.email_notifications ?? defaults.notifications.emailNotifications),
      importNotifications: Boolean(row.import_notifications ?? defaults.notifications.importNotifications),
      securityNotifications: Boolean(row.security_notifications ?? defaults.notifications.securityNotifications),
    },
  };
}

function profileFromSettings(settings: OwnerSettings): OwnerProfile {
  return {
    id: settings.ownerId,
    email: settings.profile.email,
    full_name: settings.profile.fullName,
    role: "super_owner",
  };
}

function mapTokenRow(row: Record<string, unknown>): OwnerApiToken {
  return {
    id: String(row.id),
    label: String(row.label ?? ""),
    tokenPreview: String(row.token_preview ?? ""),
    isRevoked: Boolean(row.is_revoked ?? false),
    createdAt: String(row.created_at ?? ""),
  };
}

function randomToken() {
  return `atlas_${crypto.randomUUID().replace(/-/g, "")}${Math.random().toString(36).slice(2, 10)}`;
}

async function hashToken(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const settingsService = {
  getCachedSettingsSnapshot() {
    const cached = localStorage.getItem(LAST_SETTINGS_STORAGE_KEY);
    return cached ? (JSON.parse(cached) as OwnerSettings) : null;
  },

  cacheSettingsSnapshot(settings: OwnerSettings) {
    writeCachedSettings(settings);
    console.log("[settings] cached locally", settings);
  },

  async getCurrentOwnerProfile() {
    const profile = await authService.getSessionProfile();
    if (!profile) {
      throw new Error("No authenticated owner profile found.");
    }
    return profile;
  },

  async loadOwnerSettings(profile?: OwnerProfile) {
    const ownerProfile = profile ?? (await this.getCurrentOwnerProfile());
    const cachedSettings = readCachedSettings(ownerProfile.id);

    if (!isSupabaseConfigured) {
      const fallbackSettings = cachedSettings ?? defaultSettings(ownerProfile);
      console.log("[settings] loaded from local cache", {
        ownerId: ownerProfile.id,
        settings: fallbackSettings,
      });
      return fallbackSettings;
    }

    try {
      const { data, error } = await supabase
        .from("owner_settings")
        .select("*")
        .eq("owner_id", ownerProfile.id)
        .maybeSingle();

      console.log("[settings] Supabase load response", {
        ownerId: ownerProfile.id,
        data,
        error,
      });

      if (error) throw error;

      const resolvedSettings = data ? mapSettingsRow(data as Record<string, unknown>, ownerProfile) : cachedSettings ?? defaultSettings(ownerProfile);
      writeCachedSettings(resolvedSettings);
      console.log("[settings] settings loaded", {
        ownerId: ownerProfile.id,
        source: data ? "supabase" : cachedSettings ? "cache" : "defaults",
        settings: resolvedSettings,
      });
      return resolvedSettings;
    } catch (error) {
      console.error("[settings] load failed", error);
      const fallbackSettings = cachedSettings ?? defaultSettings(ownerProfile);
      console.log("[settings] falling back after load failure", {
        ownerId: ownerProfile.id,
        settings: fallbackSettings,
      });
      return fallbackSettings;
    }
  },

  async saveOwnerSettings(settings: OwnerSettings) {
    writeCachedSettings(settings);

    if (!isSupabaseConfigured) {
      console.log("[settings] saved to local cache", settings);
      return settings;
    }

    const payload = {
      owner_id: settings.ownerId,
      full_name: settings.profile.fullName,
      workspace_name: settings.workspace.workspaceName,
      company_name: settings.workspace.companyName,
      company_website: settings.workspace.companyWebsite,
      dark_mode: settings.appearance.darkMode,
      accent_color: settings.appearance.accentColor,
      reduce_motion: settings.appearance.reduceMotion,
      compact_layout: settings.appearance.compactLayout,
      email_notifications: settings.notifications.emailNotifications,
      import_notifications: settings.notifications.importNotifications,
      security_notifications: settings.notifications.securityNotifications,
      updated_at: new Date().toISOString(),
    };

    console.log("[settings] saving", payload);

    const { data, error } = await supabase
      .from("owner_settings")
      .upsert(
      payload,
      { onConflict: "owner_id" },
    )
      .select("*")
      .single();

    console.log("[settings] Supabase save response", {
      data,
      error,
    });

    if (error) {
      console.error("[settings] save failed", error);
      throw error;
    }

    const profileUpdate = await supabase.from("profiles").update({ full_name: settings.profile.fullName }).eq("id", settings.ownerId);
    if (profileUpdate.error) {
      console.warn("[settings] profile name update failed", profileUpdate.error);
    }

    const savedSettings = data ? mapSettingsRow(data as Record<string, unknown>, profileFromSettings(settings)) : settings;
    writeCachedSettings(savedSettings);
    console.log("[settings] settings saved", savedSettings);
    return savedSettings;
  },

  async listApiTokens(ownerId: string) {
    if (!isSupabaseConfigured) {
      return readCachedTokens(ownerId);
    }

    const { data, error } = await supabase
      .from("owner_api_tokens")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    console.log("[settings] Supabase tokens response", {
      ownerId,
      data,
      error,
    });

    if (error) throw error;
    const tokens = (data ?? []).map((row) => mapTokenRow(row as Record<string, unknown>));
    writeCachedTokens(ownerId, tokens);
    return tokens;
  },

  async createApiToken(ownerId: string, label: string) {
    const token = randomToken();
    const tokenPreview = `${token.slice(0, 8)}...${token.slice(-4)}`;
    const tokenSecretHash = await hashToken(token);

    if (!isSupabaseConfigured) {
      const current = await this.listApiTokens(ownerId);
      const nextToken: OwnerApiToken = {
        id: crypto.randomUUID(),
        label,
        tokenPreview,
        isRevoked: false,
        createdAt: new Date().toISOString(),
      };
      writeCachedTokens(ownerId, [nextToken, ...current]);
      return { created: nextToken, token };
    }

    const { data, error } = await supabase
      .from("owner_api_tokens")
      .insert({
        owner_id: ownerId,
        label,
        token_preview: tokenPreview,
        token_secret_hash: tokenSecretHash,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Supabase did not return the created API token.");
    }

    const createdToken = mapTokenRow(data as Record<string, unknown>);
    const current = readCachedTokens(ownerId);
    writeCachedTokens(ownerId, [createdToken, ...current.filter((item) => item.id !== createdToken.id)]);

    return {
      created: createdToken,
      token,
    };
  },

  async revokeApiToken(ownerId: string, tokenId: string) {
    if (!isSupabaseConfigured) {
      const current = await this.listApiTokens(ownerId);
      const next = current.map((token) => (token.id === tokenId ? { ...token, isRevoked: true } : token));
      writeCachedTokens(ownerId, next);
      return;
    }

    const { error } = await supabase
      .from("owner_api_tokens")
      .update({ is_revoked: true, updated_at: new Date().toISOString() })
      .eq("id", tokenId)
      .eq("owner_id", ownerId);

    if (error) throw error;

    const current = readCachedTokens(ownerId);
    writeCachedTokens(
      ownerId,
      current.map((token) => (token.id === tokenId ? { ...token, isRevoked: true } : token)),
    );
  },
};
