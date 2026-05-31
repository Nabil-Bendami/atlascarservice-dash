export type AgencyStatus = "active" | "suspended";
export type CarAvailability = "available" | "rented" | "maintenance";
export type OwnerRole = "super_owner" | "agency_owner" | "guest";

export interface OwnerProfile {
  id: string;
  email: string;
  full_name: string;
  role: OwnerRole;
}

export interface DashboardStats {
  totalAgencies: number;
  totalCars: number;
  totalCities: number;
  totalReservations: number;
  availableCars: number;
  rentedCars: number;
  estimatedRevenue: number;
  totalTraffic: number;
  activeAgencies: number;
  suspendedAgencies: number;
}

export interface ChartDatum {
  name: string;
  value: number;
}

export interface City {
  id: string;
  name: string;
  region: string;
  agenciesCount: number;
  carsCount: number;
  reservationsCount: number;
  trafficCount: number;
  latitude: number;
  longitude: number;
  revenue?: number;
}

export interface Agency {
  id: string;
  name: string;
  email: string;
  logo: string;
  coverImage: string;
  cityId: string;
  cityName: string;
  region: string;
  address: string;
  phone: string;
  whatsapp: string;
  description: string;
  latitude: number;
  longitude: number;
  status: AgencyStatus;
  verified: boolean;
  carsCount: number;
  reservationsCount: number;
  estimatedRevenue: number;
  views: number;
  conversionRate: number;
}

export interface Car {
  id: string;
  agencyId: string;
  agencyName: string;
  cityId: string;
  cityName: string;
  photos: string[];
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  availability: CarAvailability;
  reservationsCount: number;
  totalRentedDays: number;
  estimatedRevenue: number;
  views: number;
  whatsappClicks: number;
  phoneClicks: number;
}

export interface ReservationHistoryItem {
  id: string;
  customerName: string;
  startDate: string;
  endDate: string;
  days: number;
  total: number;
  status: "confirmed" | "completed" | "cancelled";
}

export interface TrafficMetric {
  cityId: string;
  cityName: string;
  region: string;
  latitude: number;
  longitude: number;
  visitors: number;
  searches: number;
  carViews: number;
  whatsappClicks: number;
  phoneClicks: number;
  reservations: number;
  conversionRate: number;
  agenciesCount: number;
  carsCount: number;
  revenue: number;
}

export interface AgencyCreateInput {
  email: string;
  password: string;
  agencyName: string;
  logo: string;
  coverImage: string;
  city: string;
  region: string;
  address: string;
  phone: string;
  whatsapp: string;
  description: string;
  latitude: number;
  longitude: number;
  status: AgencyStatus;
  verified: boolean;
}
