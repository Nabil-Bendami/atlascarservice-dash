import { mockCharts, mockDashboardStats } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { reservationService } from "@/services/reservationService";
import type { ChartDatum, DashboardStats } from "@/types";

export const statsService = {
  async getDashboardStats() {
    if (!isSupabaseConfigured) {
      return mockDashboardStats;
    }

    const { data, error } = await supabase.rpc("get_owner_dashboard_stats");
    if (error) throw error;

    const reservationsCount = await reservationService.getReservationsCount();
    return {
      ...(data as DashboardStats),
      totalReservations: reservationsCount,
    };
  },

  async getReservationsByMonth() {
    return this.getChartData("reservationsByMonth", "get_reservations_by_month");
  },

  async getTopCities() {
    return this.getChartData("topCities", "get_top_cities");
  },

  async getTopAgencies() {
    return this.getChartData("topAgencies", "get_top_agencies");
  },

  async getTopRentedCars() {
    return this.getChartData("topRentedCars", "get_top_rented_cars");
  },

  async getRevenueByCity() {
    return this.getChartData("revenueByCity", "get_revenue_by_city");
  },

  async getChartData(mockKey: keyof typeof mockCharts, rpcName: string) {
    if (!isSupabaseConfigured) {
      return mockCharts[mockKey];
    }

    const { data, error } = await supabase.rpc(rpcName);
    if (error) throw error;
    return data as ChartDatum[];
  },
};
