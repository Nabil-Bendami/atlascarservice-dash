import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type OwnerReservationStatus = "pending" | "verified" | "rejected" | string;

interface ReservationRow {
  id: string;
  agency_id: string | null;
  agencyId?: string | null;
  car_id: string | null;
  carId?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  city?: string | null;
  start_date: string | null;
  end_date: string | null;
  total_days?: number | null;
  total_amount?: number | null;
  total_price?: number | null;
  status: OwnerReservationStatus | null;
  created_at: string | null;
  verified_at?: string | null;
  rejected_at?: string | null;
  message?: string | null;
}

interface CarRow {
  id: string;
  brand?: string | null;
  image_url?: string | null;
  model?: string | null;
  name?: string | null;
  agency_id?: string | null;
}

interface AgencyRow {
  id: string;
  name?: string | null;
  city?: string | null;
  phone?: string | null;
}

export interface OwnerReservation {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  city: string;
  carId: string | null;
  carName: string;
  carImage: string | null;
  agencyId: string | null;
  agencyName: string;
  agencyCity: string;
  startDate: string | null;
  endDate: string | null;
  totalDays: number;
  totalPrice: number;
  status: OwnerReservationStatus;
  createdAt: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  message: string;
}

export type OwnerReservationFilter = "all" | "pending" | "verified" | "rejected";

const emptyValue = "Not provided";

function getDateDiffInDays(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const diff = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(diff, 1);
}

function mapReservation(row: ReservationRow, car: CarRow | null, agency: AgencyRow | null, carImage: string | null): OwnerReservation {
  const reservationCarId = row.car_id || row.carId || null;
  const reservationAgencyId = row.agency_id || row.agencyId || null;
  const carName = car?.name || car?.model || car?.brand || "Unknown car";
  const totalPrice = Number(row.total_price ?? row.total_amount ?? 0);

  return {
    id: row.id,
    clientName: row.client_name || emptyValue,
    clientPhone: row.client_phone || emptyValue,
    clientEmail: row.client_email || emptyValue,
    city: row.city || agency?.city || emptyValue,
    carId: reservationCarId,
    carName,
    carImage,
    agencyId: reservationAgencyId,
    agencyName: agency?.name || "Unknown agency",
    agencyCity: agency?.city || emptyValue,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days ?? getDateDiffInDays(row.start_date, row.end_date)),
    totalPrice,
    status: row.status || "pending",
    createdAt: row.created_at,
    verifiedAt: row.verified_at ?? null,
    rejectedAt: row.rejected_at ?? null,
    message: row.message || emptyValue,
  };
}

async function fetchCarsForReservations(carIds: string[]) {
  if (!carIds.length) return [] as CarRow[];

  const result = await supabase
    .from("cars")
    .select("id, name, brand, model, image_url, agency_id")
    .in("id", carIds);

  if (!result.error) return (result.data ?? []) as CarRow[];

  const message = result.error.message.toLowerCase();
  if (!message.includes("image_url")) throw result.error;

  const fallback = await supabase
    .from("cars")
    .select("id, name, brand, model, agency_id")
    .in("id", carIds);

  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []) as CarRow[];
}

async function fetchAgenciesForReservations(agencyIds: string[]) {
  if (!agencyIds.length) return [] as AgencyRow[];

  const result = await supabase
    .from("agencies")
    .select("id, name, city, phone")
    .in("id", agencyIds);

  if (!result.error) return (result.data ?? []) as AgencyRow[];

  const message = result.error.message.toLowerCase();
  if (!message.includes("city")) throw result.error;

  const fallback = await supabase
    .from("agencies")
    .select("id, name, phone")
    .in("id", agencyIds);

  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []) as AgencyRow[];
}

export const reservationService = {
  async listOwnerReservations() {
    if (!isSupabaseConfigured) {
      return [] satisfies OwnerReservation[];
    }

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("OWNER_RESERVATIONS_FETCH_ERROR_FULL", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("OWNER_RESERVATIONS_DATA", data);

    const reservations = (data ?? []) as ReservationRow[];
    console.log("RESERVATIONS_RAW", reservations);

    const carIds = Array.from(new Set(reservations.map((reservation) => reservation.car_id).filter(Boolean))) as string[];
    const agencyIds = Array.from(new Set(reservations.map((reservation) => reservation.agency_id).filter(Boolean))) as string[];
    const [cars, agencies] = await Promise.all([
      fetchCarsForReservations(carIds).catch((lookupError) => {
        console.warn("CARS_LOOKUP_FAILED", lookupError);
        return [] as CarRow[];
      }),
      fetchAgenciesForReservations(agencyIds).catch((lookupError) => {
        console.warn("AGENCIES_LOOKUP_FAILED", lookupError);
        return [] as AgencyRow[];
      }),
    ]);

    console.log("CARS_RAW", cars);
    console.log("AGENCIES_RAW", agencies);

    const mappedReservations = reservations.map((reservation) => {
      const reservationCarId = reservation.car_id || reservation.carId || null;
      const reservationAgencyId = reservation.agency_id || reservation.agencyId || null;
      const car = cars.find((candidate) => candidate.id === reservationCarId) ?? null;
      const agency = agencies.find((candidate) => candidate.id === reservationAgencyId) ?? null;

      console.log("RESERVATION_MAPPING_DEBUG", {
        reservationId: reservation.id,
        reservationCarId,
        reservationAgencyId,
        foundCar: car,
        foundAgency: agency,
      });

      if (!car || !agency) {
        console.warn("Missing car/agency for reservation", reservation);
      }

      return mapReservation(reservation, car, agency, car?.image_url ?? null);
    });

    console.log("RESERVATIONS_MAPPED", mappedReservations);

    return mappedReservations;
  },

  async getReservationsCount() {
    if (!isSupabaseConfigured) return 0;

    const { count, error } = await supabase.from("reservations").select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },

  async verifyReservation(reservationId: string) {
    const now = new Date().toISOString();
    const updateWithVerifiedAt = await supabase
      .from("reservations")
      .update({ status: "verified", verified_at: now, updated_at: now })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (!updateWithVerifiedAt.error) return;

    const message = updateWithVerifiedAt.error.message.toLowerCase();
    if (!message.includes("verified_at")) {
      throw updateWithVerifiedAt.error;
    }

    const fallback = await supabase
      .from("reservations")
      .update({ status: "verified", updated_at: now })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (fallback.error) throw fallback.error;
  },

  async rejectReservation(reservationId: string) {
    const now = new Date().toISOString();
    const updateWithRejectedAt = await supabase
      .from("reservations")
      .update({ status: "rejected", rejected_at: now, updated_at: now })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (!updateWithRejectedAt.error) return;

    const message = updateWithRejectedAt.error.message.toLowerCase();
    if (!message.includes("rejected_at")) {
      throw updateWithRejectedAt.error;
    }

    const fallback = await supabase
      .from("reservations")
      .update({ status: "rejected", updated_at: now })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (fallback.error) throw fallback.error;
  },
};
