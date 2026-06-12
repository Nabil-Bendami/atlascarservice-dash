import { supabase } from "@/lib/supabase";

export type TrafficDebugSnapshot = {
  tables?: Record<string, { exists: boolean; rowCount: number | null }>;
  summary?: Record<string, unknown>;
  latestEvents?: Array<Record<string, unknown>>;
  dashboardRows?: Array<Record<string, unknown>>;
  cityCounts?: Array<Record<string, unknown>>;
  dailyEvolution?: Array<Record<string, unknown>>;
};

export const trafficDebugService = {
  async getSnapshot() {
    console.log("TRAFFIC_DASHBOARD_QUERY", {
      rpc: "get_traffic_debug_snapshot",
      reads: ["traffic", "traffic_events", "analytics", "city_traffic_metrics"],
    });

    const response = await supabase.rpc("get_traffic_debug_snapshot");
    console.log("TRAFFIC_DASHBOARD_RAW_RESULT", response.data);
    console.log("TRAFFIC_DASHBOARD_CITY_COUNTS", (response.data as TrafficDebugSnapshot | null)?.cityCounts ?? []);

    if (response.error) throw response.error;
    return (response.data ?? {}) as TrafficDebugSnapshot;
  },
};
