export type AgencyStatus = "active" | "suspended";
export type CarAvailability = "available" | "rented" | "maintenance";
export type OwnerRole = "super_owner" | "agency" | "agency_owner" | "client" | "guest";

export interface OwnerProfile {
  id: string;
  email: string;
  full_name: string;
  role: OwnerRole;
  agency_id?: string | null;
}

export interface OwnerSettings {
  ownerId: string;
  profile: {
    fullName: string;
    email: string;
  };
  workspace: {
    workspaceName: string;
    companyName: string;
    companyWebsite: string;
  };
  appearance: {
    darkMode: boolean;
    accentColor: string;
    reduceMotion: boolean;
    compactLayout: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    importNotifications: boolean;
    securityNotifications: boolean;
  };
}

export interface OwnerApiToken {
  id: string;
  label: string;
  tokenPreview: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "unread" | "read" | string;
  createdAt: string;
}

export interface OwnerReview {
  id: string;
  rating: number;
  comment: string;
  targetType: "general" | "agency" | string;
  agencyId: string | null;
  agencyName: string | null;
  status: "pending" | "published" | "rejected" | "deleted" | string;
  createdAt: string;
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
  isBlocked: boolean;
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
  transmission?: string;
  fuelType?: string;
  seats?: number;
  description?: string;
}

export interface ReservationHistoryItem {
  id: string;
  customerName: string;
  customerPhone?: string;
  city?: string;
  carName?: string;
  startDate: string;
  endDate: string;
  days: number;
  total: number;
  status: "pending" | "verified" | "confirmed" | "completed" | "cancelled" | "rejected";
  message?: string;
}

export interface TrafficMetric {
  cityId: string;
  cityName: string;
  region: string;
  latitude: number;
  longitude: number;
  visitors: number;
  uniqueVisitors?: number;
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
  cityId: number | null;
  city: string;
  region: string;
  address: string;
  phone: string;
  whatsapp: string;
  description?: string;
  latitude: number;
  longitude: number;
  status: AgencyStatus;
  verified: boolean;
}

export interface AgencyImportRow {
  rowNumber: number;
  agency_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  address: string;
  description?: string;
  status?: string;
  is_verified?: string | boolean;
  logo_url?: string;
  cover_image_url?: string;
}

export interface CarImportRow {
  rowNumber: number;
  agency_name?: string;
  agency_email?: string;
  brand: string;
  model: string;
  year: number | string;
  price_per_day: number | string;
  city: string;
  transmission?: string;
  fuel_type?: string;
  seats?: number | string;
  image_url?: string;
  availability_status?: string;
  description?: string;
}
