import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyOwnerAppearance } from "@/lib/theme";
import { settingsService } from "@/services/settingsService";
import type { OwnerApiToken, OwnerProfile, OwnerSettings } from "@/types";

type OwnerSettingsContextValue = {
  apiTokens: OwnerApiToken[];
  loading: boolean;
  profile: OwnerProfile | null;
  settings: OwnerSettings | null;
  previewSettings: (preview: OwnerSettings | null) => void;
  refresh: () => Promise<void>;
  revokeToken: (tokenId: string) => Promise<void>;
  saveSettings: (nextSettings: OwnerSettings) => Promise<void>;
  createToken: (label: string) => Promise<{ token: string }>;
};

const OwnerSettingsContext = createContext<OwnerSettingsContextValue | null>(null);

export function OwnerSettingsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [settings, setSettings] = useState<OwnerSettings | null>(() => settingsService.getCachedSettingsSnapshot());
  const [apiTokens, setApiTokens] = useState<OwnerApiToken[]>([]);

  const previewSettings = useCallback((preview: OwnerSettings | null) => {
    console.log("[owner-settings] preview settings applied", preview);
    if (preview) {
      settingsService.cacheSettingsSnapshot(preview);
    }
    applyOwnerAppearance(preview);
  }, []);

  useEffect(() => {
    applyOwnerAppearance(settings);
  }, [settings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ownerProfile = await settingsService.getCurrentOwnerProfile();
      const [ownerSettings, tokens] = await Promise.all([
        settingsService.loadOwnerSettings(ownerProfile),
        settingsService.listApiTokens(ownerProfile.id),
      ]);
      console.log("[owner-settings] settings loaded", {
        ownerId: ownerProfile.id,
        ownerSettings,
        tokens,
      });
      setProfile(ownerProfile);
      setSettings(ownerSettings);
      setApiTokens(tokens);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch((error) => {
      console.error("[owner-settings] initial load failed", error);
      setLoading(false);
    });
  }, [refresh]);

  const saveSettings = useCallback(async (nextSettings: OwnerSettings) => {
    console.log("[owner-settings] save requested", nextSettings);
    const saved = await settingsService.saveOwnerSettings(nextSettings);
    console.log("[owner-settings] save completed", saved);
    setSettings(saved);
  }, []);

  const createToken = useCallback(
    async (label: string) => {
      if (!profile) throw new Error("No owner profile loaded.");
      const { created, token } = await settingsService.createApiToken(profile.id, label);
      setApiTokens((current) => [created, ...current]);
      return { token };
    },
    [profile],
  );

  const revokeToken = useCallback(
    async (tokenId: string) => {
      if (!profile) throw new Error("No owner profile loaded.");
      await settingsService.revokeApiToken(profile.id, tokenId);
      setApiTokens((current) => current.map((token) => (token.id === tokenId ? { ...token, isRevoked: true } : token)));
    },
    [profile],
  );

  const value = useMemo<OwnerSettingsContextValue>(
    () => ({
      apiTokens,
      loading,
      profile,
      previewSettings,
      refresh,
      revokeToken,
      saveSettings,
      settings,
      createToken,
    }),
    [apiTokens, createToken, loading, previewSettings, profile, refresh, revokeToken, saveSettings, settings],
  );

  return <OwnerSettingsContext.Provider value={value}>{children}</OwnerSettingsContext.Provider>;
}

export function useOwnerSettings() {
  const context = useContext(OwnerSettingsContext);
  if (!context) {
    throw new Error("useOwnerSettings must be used within OwnerSettingsProvider.");
  }
  return context;
}
