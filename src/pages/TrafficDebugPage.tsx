import { Bug, RefreshCw } from "lucide-react";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsyncData } from "@/hooks/useAsyncData";
import { trafficDebugService } from "@/services/trafficDebugService";

export function TrafficDebugPage() {
  const snapshotQuery = useAsyncData(() => trafficDebugService.getSnapshot(), []);

  const snapshot = snapshotQuery.data ?? {};
  const tables = snapshot.tables ?? {};
  const latestEvents = snapshot.latestEvents ?? [];
  const latestEvent = latestEvents[0] ?? null;
  const dashboardRows = snapshot.dashboardRows ?? [];
  const cityCounts = snapshot.cityCounts ?? [];
  const dailyEvolution = snapshot.dailyEvolution ?? [];
  const summary = snapshot.summary ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diagnostics"
        title="Traffic Debug"
        subtitle="Read-only visibility into real website analytics stored in Supabase traffic_events."
        actions={
          <Button type="button" variant="outline" onClick={snapshotQuery.reload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <AsyncState loading={snapshotQuery.loading} error={snapshotQuery.error} onRetry={snapshotQuery.reload}>
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                Latest real event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <DebugField label="Detected City" value={String(latestEvent?.city ?? "No events yet")} />
                <DebugField label="Detected visitor_id" value={String(latestEvent?.visitor_id ?? "No events yet")} />
                <DebugField label="Detected session_id" value={String(latestEvent?.session_id ?? "No events yet")} />
                <DebugField label="Last event type" value={String(latestEvent?.event_type ?? "No events yet")} />
              </div>

              <DebugJson
                title="Supabase insert result / Errors"
                value={
                  latestEvent
                    ? { status: "Latest insert visible in traffic_events", latestEvent }
                    : { status: "No traffic_events rows found", error: "No real website events have been inserted yet." }
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database audit</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {["traffic", "traffic_events", "analytics"].map((tableName) => {
                const table = tables[tableName];
                return (
                  <DebugField
                    key={tableName}
                    label={tableName}
                    value={table?.exists ? `${table.rowCount ?? 0} rows` : "missing"}
                  />
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DebugJson title="Traffic summary" value={summary} />
          <DebugJson title="TRAFFIC_DASHBOARD_CITY_COUNTS" value={cityCounts} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DebugJson title="Dashboard query rows: get_traffic_by_city()" value={dashboardRows} />
          <DebugJson title="Daily traffic evolution: last 30 days" value={dailyEvolution} />
        </div>

        <DebugJson title="Last real traffic_events rows" value={latestEvents} />
      </AsyncState>
    </div>
  );
}

function DebugField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DebugJson({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[420px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
