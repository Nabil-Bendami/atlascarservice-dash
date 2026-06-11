import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type OwnerReservationStatus = "pending" | "verified" | "rejected" | string;

interface ReservationRow {
  id: string;
  agency_id: string | null;
  car_id: string | null;
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
  price_per_day?: number | null;
}

interface CarImageRow {
  car_id: string;
  image_url: string | null;
  sort_order?: number | null;
}

interface AgencyRow {
  id: string;
  name?: string | null;
  city?: string | null;
  city_name?: string | null;
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

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
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
  const carName = car?.name || [car?.brand, car?.model].filter(Boolean).join(" ").trim() || "Unknown car";
  const totalPrice = Number(row.total_price ?? row.total_amount ?? 0);

  return {
    id: row.id,
    clientName: row.client_name || emptyValue,
    clientPhone: row.client_phone || emptyValue,
    clientEmail: row.client_email || emptyValue,
    city: row.city || agency?.city_name || agency?.city || emptyValue,
    carId: row.car_id,
    carName,
    carImage,
    agencyId: row.agency_id,
    agencyName: agency?.name || "Unknown agency",
    agencyCity: agency?.city_name || agency?.city || emptyValue,
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

export const reservationService = {
  async listOwnerReservations() {
    if (!isSupabaseConfigured) {
      return [] satisfies OwnerReservation[];
    }

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .in("status", ["pending", "verified", "rejected"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("OWNER_RESERVATIONS_FETCH_ERROR", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log("OWNER_RESERVATIONS_FETCH_RESPONSE", {
      count: data?.length ?? 0,
      rows: data ?? [],
    });

    const reservations = (data ?? []) as ReservationRow[];
    const carIds = uniqueIds(reservations.map((reservation) => reservation.car_id));
    const agencyIds = uniqueIds(reservations.map((reservation) => reservation.agency_id));

    const [carsResult, agenciesResult, imagesResult] = await Promise.all([
      carIds.length ? supabase.from("cars").select("*").in("id", carIds) : Promise.resolve({ data: [], error: null }),
      agencyIds.length ? supabase.from("agencies").select("*").in("id", agencyIds) : Promise.resolve({ data: [], error: null }),
      carIds.length
        ? supabase.from("car_images").select("*").in("car_id", carIds).order("sort_order", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (carsResult.error) throw carsResult.error;
    if (agenciesResult.error) throw agenciesResult.error;
    if (imagesResult.error) throw imagesResult.error;

    const carsById = new Map(((carsResult.data ?? []) as CarRow[]).map((car) => [car.id, car]));
    const agenciesById = new Map(((agenciesResult.data ?? []) as AgencyRow[]).map((agency) => [agency.id, agency]));
    const imagesByCarId = new Map<string, string>();

    ((imagesResult.data ?? []) as CarImageRow[]).forEach((image) => {
      if (image.car_id && image.image_url && !imagesByCarId.has(image.car_id)) {
        imagesByCarId.set(image.car_id, image.image_url);
      }
    });

    return reservations.map((reservation) =>
      mapReservation(
        reservation,
        reservation.car_id ? carsById.get(reservation.car_id) ?? null : null,
        reservation.agency_id ? agenciesById.get(reservation.agency_id) ?? null : null,
        reservation.car_id ? imagesByCarId.get(reservation.car_id) ?? null : null,
      ),
    );
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
