import { mockAgencies, mockAgencyFromInput, mockCars, mockReservationHistory } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Agency, AgencyCreateInput, Car, ReservationHistoryItem } from "@/types";

function mapAgency(row: Record<string, unknown>): Agency {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    logo: String(row.logo ?? row.logo_url ?? ""),
    coverImage: String(row.cover_image ?? row.cover_url ?? ""),
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
    verified: Boolean(row.verified ?? row.is_verified ?? false),
    carsCount: Number(row.cars_count ?? 0),
    reservationsCount: Number(row.reservations_count ?? 0),
    estimatedRevenue: Number(row.estimated_revenue ?? 0),
    views: Number(row.views ?? 0),
    conversionRate: Number(row.conversion_rate ?? 0),
  };
}

function mapCar(row: Record<string, unknown>): Car {
  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    agencyName: String(row.agency_name ?? ""),
    cityId: String(row.city_id ?? ""),
    cityName: String(row.city_name ?? ""),
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    year: Number(row.year ?? 0),
    pricePerDay: Number(row.price_per_day ?? 0),
    availability: (row.availability as Car["availability"]) ?? "available",
    reservationsCount: Number(row.reservations_count ?? 0),
    totalRentedDays: Number(row.total_rented_days ?? 0),
    estimatedRevenue: Number(row.estimated_revenue ?? 0),
    views: Number(row.views ?? 0),
    whatsappClicks: Number(row.whatsapp_clicks ?? 0),
    phoneClicks: Number(row.phone_clicks ?? 0),
  };
}

export const agencyService = {
  async listAgencies(cityId?: string) {
    if (!isSupabaseConfigured) {
      return cityId ? mockAgencies.filter((agency) => agency.cityId === cityId) : mockAgencies;
    }

    let query = supabase.from("owner_agencies_view").select("*").order("name");
    if (cityId) {
      query = query.eq("city_id", Number(cityId));
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => mapAgency(row as Record<string, unknown>));
  },

  async getAgencyById(agencyId: string) {
    if (!isSupabaseConfigured) {
      return mockAgencies.find((agency) => agency.id === agencyId) ?? null;
    }

    const { data, error } = await supabase.from("owner_agencies_view").select("*").eq("id", agencyId).single();
    if (error) throw error;
    return mapAgency(data as Record<string, unknown>);
  },

  async getAgencyCars(agencyId: string) {
    if (!isSupabaseConfigured) {
      return mockCars.filter((car) => car.agencyId === agencyId);
    }

    const { data, error } = await supabase.from("owner_cars_view").select("*").eq("agency_id", agencyId);
    if (error) throw error;
    return (data ?? []).map((row) => mapCar(row as Record<string, unknown>));
  },

  async createAgencyWithAuth(input: AgencyCreateInput) {
    if (!isSupabaseConfigured) {
      return mockAgencyFromInput(input);
    }

    // Creating auth users from the client should happen through a protected server-side function.
    const { data, error } = await supabase.functions.invoke("create-agency-user", {
      body: input,
    });
    if (error) throw error;
    return {
      ...mockAgencyFromInput(input),
      id: String((data as { agencyId?: string })?.agencyId ?? crypto.randomUUID()),
    };
  },

  async getAgencyReservations(agencyId: string) {
    if (!isSupabaseConfigured) {
      return mockReservationHistory.map((reservation, index) => ({
        ...reservation,
        id: `${agencyId}-${index + 1}`,
      }));
    }

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("agency_id", agencyId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return data as ReservationHistoryItem[];
  },
};
