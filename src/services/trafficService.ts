import { mockCharts, mockTraffic } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ChartDatum, TrafficMetric } from "@/types";

export const trafficService = {
  async listTrafficByCity() {
    if (!isSupabaseConfigured) {
      return mockTraffic;
    }

    const { data, error } = await supabase.from("city_traffic_metrics").select("*").order("visitors", {
      ascending: false,
    });
    if (error) throw error;
    return data as TrafficMetric[];
  },

  async getCityTraffic(cityId: string) {
    if (!isSupabaseConfigured) {
      return mockTraffic.find((item) => item.cityId === cityId) ?? null;
    }

    const { data, error } = await supabase
      .from("city_traffic_metrics")
      .select("*")
      .eq("city_id", cityId)
      .single();
    if (error) throw error;
    return data as TrafficMetric;
  },

  async getCityTrafficCharts(cityId: string) {
    if (!isSupabaseConfigured) {
      return {
        trend: mockCharts.reservationsByMonth,
        channelMix: [
          { name: "Searches", value: 62 },
          { name: "Views", value: 23 },
          { name: "Clicks", value: 15 },
        ] satisfies ChartDatum[],
      };
    }

    const { data, error } = await supabase.rpc("get_city_traffic_charts", { selected_city_id: cityId });
    if (error) throw error;
    return data as { trend: ChartDatum[]; channelMix: ChartDatum[] };
  },
};
