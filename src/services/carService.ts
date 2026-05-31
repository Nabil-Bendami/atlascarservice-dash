import { mockCars, mockReservationHistory } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Car, ReservationHistoryItem } from "@/types";

export interface CarFilters {
  city?: string;
  agency?: string;
  brand?: string;
  availability?: string;
  priceMin?: number;
  priceMax?: number;
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

export const carService = {
  async listCars(filters: CarFilters = {}) {
    if (!isSupabaseConfigured) {
      return mockCars.filter((car) => {
        return (
          (!filters.city || car.cityId === filters.city) &&
          (!filters.agency || car.agencyId === filters.agency) &&
          (!filters.brand || car.brand.toLowerCase().includes(filters.brand.toLowerCase())) &&
          (!filters.availability || car.availability === filters.availability) &&
          (!filters.priceMin || car.pricePerDay >= filters.priceMin) &&
          (!filters.priceMax || car.pricePerDay <= filters.priceMax)
        );
      });
    }

    let query = supabase.from("owner_cars_view").select("*");
    if (filters.city) query = query.eq("city_id", Number(filters.city));
    if (filters.agency) query = query.eq("agency_id", filters.agency);
    if (filters.brand) query = query.ilike("brand", `%${filters.brand}%`);
    if (filters.availability) query = query.eq("availability", filters.availability);
    if (filters.priceMin) query = query.gte("price_per_day", filters.priceMin);
    if (filters.priceMax) query = query.lte("price_per_day", filters.priceMax);

    const { data, error } = await query.order("estimated_revenue", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapCar(row as Record<string, unknown>));
  },

  async getCarById(carId: string) {
    if (!isSupabaseConfigured) {
      return mockCars.find((car) => car.id === carId) ?? null;
    }

    const { data, error } = await supabase.from("owner_cars_view").select("*").eq("id", carId).single();
    if (error) throw error;
    return mapCar(data as Record<string, unknown>);
  },

  async getReservationHistory(carId: string) {
    if (!isSupabaseConfigured) {
      return mockReservationHistory;
    }

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("car_id", carId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return data as ReservationHistoryItem[];
  },
};
