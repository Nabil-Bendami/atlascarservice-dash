import { mockAgencies, mockCars, mockReservationHistory } from "@/data/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Agency, Car, City, ReservationHistoryItem } from "@/types";

export interface CarFilters {
  city?: string;
  agency?: string;
  brand?: string;
  availability?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface CarsManagementData {
  agencies: Agency[];
  brands: string[];
  cars: Car[];
  cities: City[];
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
    isBlocked: Boolean(row.is_blocked ?? false),
    verified: Boolean(row.verified ?? row.is_verified ?? false),
    carsCount: Number(row.cars_count ?? 0),
    reservationsCount: Number(row.reservations_count ?? 0),
    estimatedRevenue: Number(row.estimated_revenue ?? 0),
    views: Number(row.views ?? 0),
    conversionRate: Number(row.conversion_rate ?? 0),
  };
}

function buildCityOptions(cars: Car[], agencies: Agency[]) {
  const cityMap = new Map<string, City>();

  for (const agency of agencies) {
    if (!agency.cityId) continue;
    if (!cityMap.has(agency.cityId)) {
      cityMap.set(agency.cityId, {
        id: agency.cityId,
        name: agency.cityName || agency.cityId,
        region: agency.region,
        agenciesCount: 0,
        carsCount: 0,
        reservationsCount: 0,
        trafficCount: 0,
        latitude: agency.latitude,
        longitude: agency.longitude,
        revenue: 0,
      });
    }
  }

  for (const city of cityMap.values()) {
    const cityAgencies = agencies.filter((agency) => agency.cityId === city.id);
    const cityCars = cars.filter((car) => car.cityId === city.id);
    city.agenciesCount = cityAgencies.length;
    city.carsCount = cityCars.length;
    city.reservationsCount = cityCars.reduce((sum, car) => sum + car.reservationsCount, 0);
    city.revenue = cityCars.reduce((sum, car) => sum + car.estimatedRevenue, 0);
  }

  return Array.from(cityMap.values())
    .filter((city) => city.agenciesCount > 0 || city.carsCount > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildBrandOptions(cars: Car[]) {
  return Array.from(new Set(cars.map((car) => car.brand).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function applyFilters(cars: Car[], filters: CarFilters) {
  return cars.filter((car) => {
    return (
      (!filters.city || car.cityId === filters.city) &&
      (!filters.agency || car.agencyId === filters.agency) &&
      (!filters.brand || car.brand === filters.brand) &&
      (!filters.availability || car.availability === filters.availability) &&
      (!filters.priceMin || car.pricePerDay >= filters.priceMin) &&
      (!filters.priceMax || car.pricePerDay <= filters.priceMax)
    );
  });
}

export const carService = {
  async getCarsManagementData(): Promise<CarsManagementData> {
    if (!isSupabaseConfigured) {
      return {
        cars: mockCars,
        agencies: mockAgencies.filter((agency) => agency.status === "active" && !agency.isBlocked),
        cities: buildCityOptions(mockCars, mockAgencies.filter((agency) => agency.status === "active" && !agency.isBlocked)),
        brands: buildBrandOptions(mockCars),
      };
    }

    const [carsResult, agenciesResult] = await Promise.all([
      supabase.from("owner_cars_view").select("*").order("estimated_revenue", { ascending: false }),
      supabase
        .from("owner_agencies_view")
        .select("*")
        .eq("status", "active")
        .eq("is_blocked", false)
        .order("name"),
    ]);

    if (carsResult.error) throw carsResult.error;
    if (agenciesResult.error) throw agenciesResult.error;

    const agencies = (agenciesResult.data ?? []).map((row) => mapAgency(row as Record<string, unknown>));
    const activeAgencyIds = new Set(agencies.map((agency) => agency.id));
    const cars = (carsResult.data ?? [])
      .map((row) => mapCar(row as Record<string, unknown>))
      .filter((car) => activeAgencyIds.has(car.agencyId));

    return {
      cars,
      agencies,
      cities: buildCityOptions(cars, agencies),
      brands: buildBrandOptions(cars),
    };
  },

  filterCars(cars: Car[], filters: CarFilters) {
    return applyFilters(cars, filters);
  },

  async getCarById(carId: string) {
    if (!isSupabaseConfigured) {
      return mockCars.find((car) => car.id === carId) ?? null;
    }

    const managementData = await this.getCarsManagementData();
    return managementData.cars.find((car) => car.id === carId) ?? null;
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
