import { createClient } from "@supabase/supabase-js";

function normalizeEnvValue(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
export const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
export const supabaseFunctionsBaseUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1` : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigStatus = {
  hasUrl: Boolean(supabaseUrl),
  hasAnonKey: Boolean(supabaseAnonKey),
  urlHost: supabaseUrl ? new URL(supabaseUrl).host : null,
  anonKeyContainsWhitespace: Boolean(supabaseAnonKey && /\s/.test(supabaseAnonKey)),
};

if (import.meta.env.DEV) {
  console.info("[supabase] client config", supabaseConfigStatus);
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
