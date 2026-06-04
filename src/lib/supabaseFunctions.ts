import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseConfigStatus, supabaseFunctionsBaseUrl, supabaseProjectRef, supabaseUrl } from "@/lib/supabase";

type FunctionErrorCode =
  | "CONFIG_MISSING"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_PAYLOAD"
  | "DATABASE_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class SupabaseFunctionError extends Error {
  code: FunctionErrorCode;
  status: number | null;
  details: unknown;

  constructor(message: string, options: { code: FunctionErrorCode; status?: number | null; details?: unknown } = { code: "UNKNOWN" }) {
    super(message);
    this.name = "SupabaseFunctionError";
    this.code = options.code;
    this.status = options.status ?? null;
    this.details = options.details ?? null;
  }
}

function redactPayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  return JSON.parse(
    JSON.stringify(payload, (key, value) => {
      if (typeof key === "string" && key.toLowerCase().includes("password")) {
        return typeof value === "string" ? `<redacted length=${value.length}>` : "<redacted>";
      }
      return value;
    }),
  ) as T;
}

function parseFunctionResponseBody(rawText: string) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return rawText;
  }
}

function toFunctionErrorMessage(functionName: string, status: number, body: unknown) {
  const bodyRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const bodyMessage =
    typeof bodyRecord?.error === "string"
      ? bodyRecord.error
      : typeof bodyRecord?.message === "string"
        ? bodyRecord.message
        : null;

  if (status === 404) {
    return `Edge Function not found: "${functionName}" is missing at ${supabaseFunctionsBaseUrl ?? "the configured Supabase project"}.`;
  }

  if (status === 401) {
    return "Unauthorized access: sign in again before creating an agency.";
  }

  if (status === 403) {
    return bodyMessage ?? "Unauthorized access: your account is not allowed to create agencies.";
  }

  if (status === 400 || status === 422) {
    return bodyMessage ?? "Invalid payload: Supabase rejected the agency data sent to the Edge Function.";
  }

  if (status >= 500) {
    return bodyMessage ?? "Database insertion failed inside the Edge Function.";
  }

  return bodyMessage ?? `Edge Function request failed with status ${status}.`;
}

function toFunctionErrorCode(status: number): FunctionErrorCode {
  if (status === 400 || status === 422) return "INVALID_PAYLOAD";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status >= 500) return "DATABASE_ERROR";
  return "UNKNOWN";
}

export async function invokeSupabaseFunction<TRequest, TResponse>(functionName: string, payload: TRequest) {
  console.log("[supabase:function] Supabase URL", supabaseUrl ?? null);
  console.log("[supabase:function] Project ref", supabaseProjectRef ?? null);
  console.log("[supabase:function] invoke:start", {
    functionName,
    requestUrl: supabaseFunctionsBaseUrl ? `${supabaseFunctionsBaseUrl}/${functionName}` : null,
    payload: redactPayload(payload),
    config: supabaseConfigStatus,
  });

  if (!isSupabaseConfigured || !supabaseFunctionsBaseUrl || !supabaseAnonKey) {
    const error = new SupabaseFunctionError("Supabase configuration missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.", {
      code: "CONFIG_MISSING",
      details: supabaseConfigStatus,
    });
    console.error("[supabase:function] invoke:config-missing", error);
    throw error;
  }

  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) {
    console.error("[supabase:function] invoke:session-error", sessionResult.error);
    throw new SupabaseFunctionError("Unauthorized access: unable to read the current Supabase session.", {
      code: "UNAUTHORIZED",
      details: sessionResult.error,
    });
  }

  const accessToken = sessionResult.data.session?.access_token ?? null;
  const requestUrl = `${supabaseFunctionsBaseUrl}/${functionName}`;

  console.log("[supabase:function] invoke:request", {
    functionName,
    requestUrl,
    hasAccessToken: Boolean(accessToken),
    headers: {
      "Content-Type": "application/json",
      apikey: "<present>",
      Authorization: accessToken ? "Bearer <session-token>" : "Bearer <anon-key>",
    },
  });

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[supabase:function] invoke:network-error", {
      functionName,
      requestUrl,
      error,
      stack: error instanceof Error ? error.stack : null,
    });
    throw new SupabaseFunctionError("Network error: unable to reach the Supabase Edge Function endpoint.", {
      code: "NETWORK_ERROR",
      details: error,
    });
  }

  const rawText = await response.text();
  const parsedBody = parseFunctionResponseBody(rawText);

  console.log("[supabase:function] invoke:response", {
    functionName,
    requestUrl,
    status: response.status,
    ok: response.ok,
    body: parsedBody,
  });
  console.log("[supabase:function] Function invoke response", {
    functionName,
    requestUrl,
    status: response.status,
    ok: response.ok,
    body: parsedBody,
  });

  if (!response.ok) {
    const error = new SupabaseFunctionError(toFunctionErrorMessage(functionName, response.status, parsedBody), {
      code: toFunctionErrorCode(response.status),
      status: response.status,
      details: parsedBody,
    });
    console.log("[supabase:function] Function error", {
      functionName,
      requestUrl,
      projectRef: supabaseProjectRef,
      status: response.status,
      body: parsedBody,
    });
    console.error("[supabase:function] invoke:failed", {
      functionName,
      requestUrl,
      error,
      stack: error.stack,
    });
    throw error;
  }

  return parsedBody as TResponse;
}
