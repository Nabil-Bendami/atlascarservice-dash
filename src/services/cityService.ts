import { mockAgencies, mockCities } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Agency, City } from "@/types";

function mapCity(row: Record<string, unknown>): City {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    region: String(row.region ?? ""),
    agenciesCount: Number(row.agencies_count ?? 0),
    carsCount: Number(row.cars_count ?? 0),
    reservationsCount: Number(row.reservations_count ?? 0),
    trafficCount: Number(row.traffic_count ?? 0),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    revenue: Number(row.revenue ?? 0),
  };
}

function mapAgency(row: Record<string, unknown>): Agency {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    logo: String(row.logo ?? ""),
    coverImage: String(row.cover_image ?? ""),
    cityId: String(row.city_id ?? ""),
    cityName: String(row.city_name ?? ""),
    region: String(row.region ?? ""),
    address: String(row.address ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    description: String(row.description ?? ""),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    status: (row.status as Agency["status"]) ?? "active",
    isBlocked: Boolean(row.is_blocked ?? false),
    isSuspended: Boolean(row.is_suspended ?? row.suspended ?? row.status === "suspended"),
    verified: Boolean(row.verified ?? false),
    carsCount: Number(row.cars_count ?? 0),
    reservationsCount: Number(row.reservations_count ?? 0),
    estimatedRevenue: Number(row.estimated_revenue ?? 0),
    views: Number(row.views ?? 0),
    conversionRate: Number(row.conversion_rate ?? 0),
  };
}

export const cityService = {
  async listCities() {
    if (!isSupabaseConfigured) {
      return mockCities;
    }

    const { data, error } = await supabase.from("owner_cities_view").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map((row) => mapCity(row as Record<string, unknown>));
  },

  async getCityById(cityId: string) {
    if (!isSupabaseConfigured) {
      return mockCities.find((city) => city.id === cityId) ?? null;
    }

    const { data, error } = await supabase.from("owner_cities_view").select("*").eq("id", Number(cityId)).maybeSingle();
    if (error) throw error;
    return data ? mapCity(data as Record<string, unknown>) : null;
  },

  async getCityAgencies(cityId: string) {
    if (!isSupabaseConfigured) {
      return mockAgencies.filter((agency) => agency.cityId === cityId);
    }

    const { data, error } = await supabase.from("owner_agencies_view").select("*").eq("city_id", Number(cityId));
    if (error) throw error;
    return (data ?? []).map((row) => mapAgency(row as Record<string, unknown>));
  },
};
