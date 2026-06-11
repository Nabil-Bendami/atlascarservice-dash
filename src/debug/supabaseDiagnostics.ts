import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import { reservationService } from "@/services/reservationService";

export type DiagnosticStatus = "success" | "failed";

export interface DiagnosticEntry {
  step: number;
  title: string;
  status: DiagnosticStatus;
  data?: unknown;
  error?: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
    raw?: string;
  };
}

type DiagnosticCallback = (entry: DiagnosticEntry) => void;

function normalizeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      code: null,
      message: error instanceof Error ? error.message : String(error),
      details: null,
      hint: null,
      raw: JSON.stringify(error, null, 2),
    };
  }

  const candidate = error as {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  };

  return {
    code: candidate.code ?? null,
    message: candidate.message ?? null,
    details: candidate.details ?? null,
    hint: candidate.hint ?? null,
    raw: JSON.stringify(error, null, 2),
  };
}

function logDiagnosticError(label: string, error: unknown) {
  const normalized = normalizeError(error);
  console.error(`${label} code`, normalized.code);
  console.error(`${label} message`, normalized.message);
  console.error(`${label} details`, normalized.details);
  console.error(`${label} hint`, normalized.hint);
  console.error(`${label} raw`, normalized.raw);
  return normalized;
}

async function runStep(
  step: number,
  title: string,
  callback: DiagnosticCallback | undefined,
  action: () => Promise<unknown>,
) {
  console.log(`STEP ${step}: ${title}`);

  try {
    const data = await action();
    console.log("SUCCESS", data);

    const entry: DiagnosticEntry = {
      step,
      title,
      status: "success",
      data,
    };
    callback?.(entry);
    return entry;
  } catch (error) {
    const normalized = logDiagnosticError("FAILED", error);
    const entry: DiagnosticEntry = {
      step,
      title,
      status: "failed",
      error: normalized,
    };
    callback?.(entry);
    return entry;
  }
}

export async function runSupabaseDiagnostics(callback?: DiagnosticCallback) {
  console.group("SUPABASE DIAGNOSTIC");

  const results: DiagnosticEntry[] = [];
  const push = (entry: DiagnosticEntry) => {
    results.push(entry);
    callback?.(entry);
  };

  const sessionResult = await runStep(1, "Environment", push, async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const session = sessionData.session;
    const envData = {
      VITE_SUPABASE_URL: supabaseUrl ?? null,
      VITE_SUPABASE_ANON_KEY_PREFIX: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 8)}...` : null,
      currentSession: session,
      currentUserId: session?.user?.id ?? null,
      currentUserEmail: session?.user?.email ?? null,
    };

    console.log("VITE_SUPABASE_URL", envData.VITE_SUPABASE_URL);
    console.log("VITE_SUPABASE_ANON_KEY_PREFIX", envData.VITE_SUPABASE_ANON_KEY_PREFIX);
    console.log("CURRENT_SESSION", envData.currentSession);
    console.log("CURRENT_USER_ID", envData.currentUserId);
    console.log("CURRENT_USER_EMAIL", envData.currentUserEmail);

    return envData;
  });

  if (sessionResult.status === "success") {
    const userId = (sessionResult.data as { currentUserId?: string | null } | undefined)?.currentUserId ?? null;
    const userEmail = (sessionResult.data as { currentUserEmail?: string | null } | undefined)?.currentUserEmail ?? null;
    console.log("SESSION_USER_ID", userId);
    console.log("SESSION_USER_EMAIL", userEmail);
  }

  await runStep(2, "Auth profile RPC", push, async () => {
    const rpcResult = await supabase.rpc("get_current_profile");
    if (rpcResult.error) throw rpcResult.error;
    return rpcResult.data;
  });

  await runStep(3, "Owner settings direct SELECT", push, async () => {
    const ownerSettingsRes = await supabase.from("owner_settings").select("*").limit(1);
    if (ownerSettingsRes.error) throw ownerSettingsRes.error;
    return ownerSettingsRes.data;
  });

  await runStep(4, "Reservations direct SELECT simple", push, async () => {
    const reservationsRes = await supabase.from("reservations").select("*").limit(1);
    if (reservationsRes.error) throw reservationsRes.error;
    return reservationsRes.data;
  });

  await runStep(5, "Reservations count", push, async () => {
    const reservationsCountRes = await supabase.from("reservations").select("id", { count: "exact", head: true });
    if (reservationsCountRes.error) throw reservationsCountRes.error;
    return { count: reservationsCountRes.count ?? 0 };
  });

  await runStep(6, "Reservations ordered", push, async () => {
    const reservationsOrderedRes = await supabase.from("reservations").select("*").order("created_at", { ascending: false }).limit(10);
    if (reservationsOrderedRes.error) throw reservationsOrderedRes.error;
    return reservationsOrderedRes.data;
  });

  await runStep(7, "Cars direct SELECT", push, async () => {
    const carsRes = await supabase.from("cars").select("id, name, brand, model, agency_id").limit(10);
    if (carsRes.error) throw carsRes.error;
    return carsRes.data;
  });

  await runStep(8, "Agencies direct SELECT", push, async () => {
    const agenciesRes = await supabase.from("agencies").select("id, name, city, phone").limit(10);
    if (agenciesRes.error) throw agenciesRes.error;
    return agenciesRes.data;
  });

  await runStep(9, "Joined SQL equivalent using Supabase relation", push, async () => {
    const joinedRes = await supabase
      .from("reservations")
      .select(`
        id,
        status,
        car_id,
        agency_id,
        client_name,
        cars:car_id ( id, name ),
        agencies:agency_id ( id, name, city )
      `)
      .limit(10);

    if (joinedRes.error) throw joinedRes.error;
    return joinedRes.data;
  });

  await runStep(10, "Dashboard reservation service", push, async () => {
    return reservationService.listOwnerReservations();
  });

  console.groupEnd();
  return results;
}

declare global {
  interface Window {
    runSupabaseDiagnostics?: () => Promise<DiagnosticEntry[]>;
  }
}

if (typeof window !== "undefined") {
  window.runSupabaseDiagnostics = () => runSupabaseDiagnostics();
}
