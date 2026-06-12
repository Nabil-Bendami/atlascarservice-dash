import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { OwnerReview } from "@/types";

interface OwnerReviewRow {
  id: string;
  rating: number | null;
  comment: string | null;
  target_type: string | null;
  agency_id: string | null;
  status: string | null;
  created_at: string | null;
  agencies?: { name?: string | null } | null;
}

function mapOwnerReview(row: OwnerReviewRow): OwnerReview {
  return {
    id: row.id,
    rating: Number(row.rating ?? 0),
    comment: row.comment ?? "",
    targetType: row.target_type ?? "general",
    agencyId: row.agency_id,
    agencyName: row.agencies?.name ?? null,
    status: row.status ?? "pending",
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

async function listOwnerReviews(): Promise<OwnerReview[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("*, agencies(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as OwnerReviewRow[]).map(mapOwnerReview);
}

async function publishReview(reviewId: string): Promise<OwnerReview> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ status: "published" })
    .eq("id", reviewId)
    .select("*, agencies(name)")
    .single();

  if (error) throw error;
  return mapOwnerReview(data as OwnerReviewRow);
}

async function rejectReview(reviewId: string): Promise<OwnerReview> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ status: "rejected" })
    .eq("id", reviewId)
    .select("*, agencies(name)")
    .single();

  if (error) throw error;
  return mapOwnerReview(data as OwnerReviewRow);
}

export const reviewService = {
  listOwnerReviews,
  publishReview,
  rejectReview,
};
