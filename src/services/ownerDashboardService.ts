import { supabase } from "@/lib/supabase";
import type { AgencyCreateInput, CarAvailability, DashboardStats } from "@/types";

export interface OwnerCityStats {
  id: number;
  name: string;
  region: string;
  agencies_count: number;
  cars_count: number;
  reservations_count: number;
  traffic_count: number;
  latitude: number | null;
  longitude: number | null;
  revenue: number;
}

export interface OwnerAgencySummary {
  id: string;
  owner_user_id: string | null;
  email: string | null;
  name: string;
  logo: string | null;
  cover_image: string | null;
  city_id: number | null;
  city_name: string | null;
  region: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  verified: boolean;
  cars_count: number;
  reservations_count: number;
  estimated_revenue: number;
  views: number;
  conversion_rate: number;
}

export interface OwnerCarSummary {
  id: string;
  agency_id: string;
  agency_name: string;
  city_id: number | null;
  city_name: string | null;
  photos: string[];
  brand: string;
  model: string;
  year: number;
  price_per_day: number;
  availability: CarAvailability | string;
  reservations_count: number;
  total_rented_days: number;
  estimated_revenue: number;
  views: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  status: string;
}

export interface OwnerTrafficByCity {
  city_id: number;
  city_name: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  visitors: number;
  searches: number;
  car_views: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  reservations: number;
  conversion_rate: number;
  agencies_count: number;
  cars_count: number;
  revenue: number;
}

export interface CityTrafficDetails {
  summary: OwnerTrafficByCity;
  charts: {
    trend: { name: string; value: number }[];
    channelMix: { name: string; value: number }[];
  };
  topCars: OwnerCarSummary[];
  topAgencies: OwnerAgencySummary[];
}

export interface CarsFilters {
  cityId?: number;
  agencyId?: string;
  brand?: string;
  availability?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
}

export const ownerDashboardService = {
  async createAgencyWithAuth(input: AgencyCreateInput & { cityId?: number | null }) {
    const { data, error } = await supabase.functions.invoke("create-agency-user", {
      body: {
        email: input.email,
        password: input.password,
        agencyName: input.agencyName,
        logo: input.logo,
        coverImage: input.coverImage,
        city: input.city,
        cityId: input.cityId ?? null,
        region: input.region,
        address: input.address,
        phone: input.phone,
        whatsapp: input.whatsapp,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        status: input.status,
        verified: input.verified,
      },
    });

    if (error) throw error;
    return data as { agencyId: string; userId: string; email: string };
  },

  async getDashboardStats() {
    const { data, error } = await supabase.rpc("get_owner_dashboard_stats");
    if (error) throw error;
    return data as DashboardStats;
  },

  async getCitiesWithStats() {
    const { data, error } = await supabase.from("owner_cities_view").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as OwnerCityStats[];
  },

  async getAgenciesByCity(cityId: number) {
    const { data, error } = await supabase
      .from("owner_agencies_view")
      .select("*")
      .eq("city_id", cityId)
      .order("name");
    if (error) throw error;
    return (data ?? []) as OwnerAgencySummary[];
  },

  async getAgencyDetails(agencyId: string) {
    const { data, error } = await supabase
      .from("owner_agencies_view")
      .select("*")
      .eq("id", agencyId)
      .single();
    if (error) throw error;
    return data as OwnerAgencySummary;
  },

  async getAgencyCarsStats(agencyId: string) {
    const { data, error } = await supabase
      .from("owner_cars_view")
      .select("*")
      .eq("agency_id", agencyId)
      .order("estimated_revenue", { ascending: false });
    if (error) throw error;
    return (data ?? []) as OwnerCarSummary[];
  },

  async getAllCarsWithStats(filters: CarsFilters = {}) {
    let query = supabase.from("owner_cars_view").select("*");

    if (filters.cityId) query = query.eq("city_id", filters.cityId);
    if (filters.agencyId) query = query.eq("agency_id", filters.agencyId);
    if (filters.brand) query = query.ilike("brand", `%${filters.brand}%`);
    if (filters.availability) query = query.eq("availability", filters.availability);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.minPrice) query = query.gte("price_per_day", filters.minPrice);
    if (filters.maxPrice) query = query.lte("price_per_day", filters.maxPrice);

    const { data, error } = await query.order("estimated_revenue", { ascending: false });
    if (error) throw error;
    return (data ?? []) as OwnerCarSummary[];
  },

  async getTrafficByCity() {
    const { data, error } = await supabase
      .from("city_traffic_metrics")
      .select("*")
      .order("visitors", { ascending: false });
    if (error) throw error;
    return (data ?? []) as OwnerTrafficByCity[];
  },

  async getCityTrafficDetails(cityId: number) {
    const [summaryResult, chartsResult, carsResult, agenciesResult] = await Promise.all([
      supabase.from("city_traffic_metrics").select("*").eq("city_id", cityId).single(),
      supabase.rpc("get_city_traffic_charts", { selected_city_id: cityId }),
      supabase
        .from("owner_cars_view")
        .select("*")
        .eq("city_id", cityId)
        .order("reservations_count", { ascending: false })
        .limit(5),
      supabase
        .from("owner_agencies_view")
        .select("*")
        .eq("city_id", cityId)
        .order("reservations_count", { ascending: false })
        .limit(5),
    ]);

    if (summaryResult.error) throw summaryResult.error;
    if (chartsResult.error) throw chartsResult.error;
    if (carsResult.error) throw carsResult.error;
    if (agenciesResult.error) throw agenciesResult.error;

    return {
      summary: summaryResult.data as OwnerTrafficByCity,
      charts: chartsResult.data as CityTrafficDetails["charts"],
      topCars: (carsResult.data ?? []) as OwnerCarSummary[],
      topAgencies: (agenciesResult.data ?? []) as OwnerAgencySummary[],
    } satisfies CityTrafficDetails;
  },
};
