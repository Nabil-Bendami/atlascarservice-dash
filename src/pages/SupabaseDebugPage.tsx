import { useMemo, useState } from "react";
import { ClipboardCopy, Play, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSupabaseDiagnostics, type DiagnosticEntry } from "@/debug/supabaseDiagnostics";

export function SupabaseDebugPage() {
  const [running, setRunning] = useState(false);
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);

  const output = useMemo(() => JSON.stringify(entries, null, 2), [entries]);

  async function handleRun() {
    setRunning(true);
    setEntries([]);

    try {
      await runSupabaseDiagnostics((entry) => {
        setEntries((current) => [...current, entry]);
      });
    } finally {
      setRunning(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Debug"
        title="Supabase diagnostics"
        subtitle="Run step-by-step Supabase checks to identify the exact failing query, function, or table."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleCopy()} disabled={!entries.length}>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copy logs
            </Button>
            <Button onClick={() => void handleRun()} disabled={running}>
              {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run diagnostics
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Step status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length ? (
            entries.map((entry) => (
              <div
                key={`${entry.step}-${entry.title}`}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  entry.status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                <div className="font-semibold">
                  Step {entry.step}: {entry.title}
                </div>
                <div className="mt-1 uppercase tracking-wide">{entry.status}</div>
                {entry.error?.message ? <div className="mt-2 break-words">{entry.error.message}</div> : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
              No diagnostics run yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{output || "[]"}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
