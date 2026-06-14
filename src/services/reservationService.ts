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
  model?: string | null;
  name?: string | null;
  agency_id?: string | null;
}

interface AgencyRow {
  id: string;
  name?: string | null;
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
const uuidLikePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeRelationId(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeUuidIds(values: Array<string | null>) {
  const normalizedValues = values.map(normalizeRelationId).filter((value): value is string => Boolean(value));
  return Array.from(
    new Set(normalizedValues.filter((value) => uuidLikePattern.test(value))),
  );
}

function getDateDiffInDays(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const diff = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(diff, 1);
}

function mapReservation(row: ReservationRow, car: CarRow | null, agency: AgencyRow | null, carImage: string | null): OwnerReservation {
  const reservationCarId = normalizeRelationId(row.car_id || row.carId);
  const reservationAgencyId = normalizeRelationId(row.agency_id || row.agencyId);
  const carName = car?.name || car?.model || car?.brand || (reservationCarId ? `Missing car: ${reservationCarId}` : "Missing car");
  const totalPrice = Number(row.total_price ?? row.total_amount ?? 0);

  return {
    id: row.id,
    clientName: row.client_name || emptyValue,
    clientPhone: row.client_phone || emptyValue,
    clientEmail: row.client_email || emptyValue,
    city: row.city || emptyValue,
    carId: reservationCarId,
    carName,
    carImage: null,
    agencyId: reservationAgencyId,
    agencyName: agency?.name || (reservationAgencyId ? `Missing agency: ${reservationAgencyId}` : "Missing agency"),
    agencyCity: emptyValue,
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

  const carsRes = await supabase
    .from("cars")
    .select("id, name, brand, model, agency_id")
    .in("id", carIds);

  if (carsRes.error) {
    console.error("CARS_ERROR", carsRes.error);
    console.error("CARS_ERROR", JSON.stringify(carsRes.error, null, 2));
    return [] as CarRow[];
  }

  return (carsRes.data ?? []) as CarRow[];
}

async function fetchAgenciesForReservations(agencyIds: string[]) {
  if (!agencyIds.length) return [] as AgencyRow[];

  const agenciesRes = await supabase
    .from("agencies")
    .select("id, name, phone")
    .in("id", agencyIds);

  if (agenciesRes.error) {
    console.error("AGENCIES_ERROR", agenciesRes.error);
    console.error("AGENCIES_ERROR", JSON.stringify(agenciesRes.error, null, 2));
    return [] as AgencyRow[];
  }

  return (agenciesRes.data ?? []) as AgencyRow[];
}

export const reservationService = {
  async listOwnerReservations() {
    if (!isSupabaseConfigured) {
      return [] satisfies OwnerReservation[];
    }

    const reservationsRes = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("OWNER_RESERVATIONS_DATA", reservationsRes.data);
    if (reservationsRes.error) {
      console.error("RESERVATIONS_ERROR", reservationsRes.error);
      console.error("RESERVATIONS_ERROR", JSON.stringify(reservationsRes.error, null, 2));
      throw new Error(reservationsRes.error.message || "Failed to load reservations");
    }

    const reservations = (reservationsRes.data ?? []) as ReservationRow[];
    console.log("RESERVATIONS_RAW", reservations);
    reservations.forEach((reservation) => {
      console.log("RESERVATION_ID", reservation.id);
      console.log("RESERVATION_CAR_ID", reservation.car_id);
      console.log("RESERVATION_AGENCY_ID", reservation.agency_id);
    });

    const carIds = normalizeUuidIds(reservations.map((reservation) => reservation.car_id || reservation.carId || null));
    const agencyIds = normalizeUuidIds(reservations.map((reservation) => reservation.agency_id || reservation.agencyId || null));
    console.log("CAR_IDS", carIds);
    console.log("AGENCY_IDS", agencyIds);
    const [cars, agencies] = await Promise.all([fetchCarsForReservations(carIds), fetchAgenciesForReservations(agencyIds)]);

    console.log("CARS_RAW", cars);
    console.log("AGENCIES_RAW", agencies);
    console.log("FIXED_CARS_QUERY_RESULT", cars);
    console.log("FIXED_AGENCIES_QUERY_RESULT", agencies);
    console.log("ALL_CARS", cars);
    console.log("ALL_AGENCIES", agencies);

    const mappedReservations = reservations.map((reservation) => {
      const reservationCarId = normalizeRelationId(reservation.car_id || reservation.carId);
      const reservationAgencyId = normalizeRelationId(reservation.agency_id || reservation.agencyId);
      const car = cars.find((candidate) => normalizeRelationId(candidate.id) === reservationCarId) ?? null;
      const agency = agencies.find((candidate) => normalizeRelationId(candidate.id) === reservationAgencyId) ?? null;

      console.log("MATCH_TEST", {
        reservationId: reservation.id,
        reservationCarId: reservation.car_id,
        reservationAgencyId: reservation.agency_id,
        carExists: cars.some((c) => c.id === reservation.car_id),
        agencyExists: agencies.some((a) => a.id === reservation.agency_id),
      });

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

      return mapReservation(reservation, car, agency, null);
    });

    console.log("RESERVATIONS_MAPPED", mappedReservations);

    return mappedReservations;
  },

  async getOwnerReservationById(reservationId: string) {
    if (!reservationId) return null;

    const reservations = await this.listOwnerReservations();
    return reservations.find((reservation) => reservation.id === reservationId) ?? null;
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
      .update({ status: "verified", verified_at: now })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (!updateWithVerifiedAt.error) return;

    const message = updateWithVerifiedAt.error.message.toLowerCase();
    if (!message.includes("verified_at")) {
      throw updateWithVerifiedAt.error;
    }

    const fallback = await supabase
      .from("reservations")
      .update({ status: "verified" })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (fallback.error) throw fallback.error;
  },

  async rejectReservation(reservationId: string) {
    const now = new Date().toISOString();
    const updateWithRejectedAt = await supabase
      .from("reservations")
      .update({ status: "rejected", rejected_at: now })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (!updateWithRejectedAt.error) return;

    const message = updateWithRejectedAt.error.message.toLowerCase();
    if (!message.includes("rejected_at")) {
      throw updateWithRejectedAt.error;
    }

    const fallback = await supabase
      .from("reservations")
      .update({ status: "rejected" })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (fallback.error) throw fallback.error;
  },
};
