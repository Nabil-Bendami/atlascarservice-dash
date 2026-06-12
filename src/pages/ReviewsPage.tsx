import { useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Star, XCircle } from "lucide-react";
import { AsyncState } from "@/components/shared/AsyncState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncData } from "@/hooks/useAsyncData";
import { reviewService } from "@/services/reviewService";
import type { OwnerReview } from "@/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusBadge(status: string) {
  if (status === "published") return <Badge variant="success">published</Badge>;
  if (status === "rejected" || status === "deleted") return <Badge variant="destructive">{status}</Badge>;
  return <Badge>pending</Badge>;
}

export function ReviewsPage() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reviewsQuery = useAsyncData(() => reviewService.listOwnerReviews(), []);
  const reviews = reviewsQuery.data ?? [];

  const counts = useMemo(
    () => ({
      pending: reviews.filter((review) => review.status === "pending").length,
      published: reviews.filter((review) => review.status === "published").length,
      rejected: reviews.filter((review) => review.status === "rejected" || review.status === "deleted").length,
    }),
    [reviews],
  );

  async function updateReview(review: OwnerReview, action: "publish" | "reject") {
    try {
      setUpdatingId(review.id);
      setActionError(null);

      if (action === "publish") {
        await reviewService.publishReview(review.id);
      } else {
        await reviewService.rejectReview(review.id);
      }

      await reviewsQuery.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update review.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner moderation"
        title="Reviews"
        subtitle="Review, publish, or reject customer reviews before they appear publicly."
        actions={
          <Button variant="outline" onClick={() => void reviewsQuery.reload()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <ReviewMetric label="Pending" value={reviewsQuery.error ? null : counts.pending} />
        <ReviewMetric label="Published" value={reviewsQuery.error ? null : counts.published} tone="published" />
        <ReviewMetric label="Rejected/deleted" value={reviewsQuery.error ? null : counts.rejected} tone="rejected" />
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </div>
      ) : null}

      <AsyncState
        loading={reviewsQuery.loading}
        error={reviewsQuery.error}
        isEmpty={!reviewsQuery.loading && reviews.length === 0}
        emptyMessage="No reviews have been submitted yet."
        onRetry={() => void reviewsQuery.reload()}
      >
        {reviews.length ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                updating={updatingId === review.id}
                onPublish={() => void updateReview(review, "publish")}
                onReject={() => void updateReview(review, "reject")}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No reviews" description="Submitted reviews will appear here for moderation." />
        )}
      </AsyncState>
    </div>
  );
}

function ReviewMetric({
  label,
  value,
  tone = "pending",
}: {
  label: string;
  value: number | null;
  tone?: "pending" | "published" | "rejected";
}) {
  const toneClasses = {
    pending: "bg-primary/10 text-primary",
    published: "bg-emerald-50 text-emerald-600",
    rejected: "bg-rose-50 text-rose-600",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{value === null ? "—" : value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${toneClasses}`}>
          <Star className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewCard({
  review,
  updating,
  onPublish,
  onReject,
}: {
  review: OwnerReview;
  updating: boolean;
  onPublish: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {statusBadge(review.status)}
              <Badge variant="secondary">{review.targetType}</Badge>
              {review.agencyName ? <Badge variant="secondary">{review.agencyName}</Badge> : null}
              <span className="text-sm text-muted-foreground">{formatDate(review.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1 text-primary">
              {Array.from({ length: 5 }, (_, index) => (
                <Star key={index} className={`h-4 w-4 ${index < Math.round(review.rating) ? "fill-current" : "text-slate-300"}`} />
              ))}
              <span className="ml-2 text-sm font-semibold text-slate-700">{review.rating}/5</span>
            </div>

            <p className="whitespace-pre-wrap rounded-2xl border border-border bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              {review.comment}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
            <Button variant="success" onClick={onPublish} disabled={updating || review.status === "published"}>
              <CheckCircle2 className="h-4 w-4" />
              {updating ? "Updating..." : "Publish"}
            </Button>
            <Button variant="destructive" onClick={onReject} disabled={updating || review.status === "rejected"}>
              <XCircle className="h-4 w-4" />
              {updating ? "Updating..." : "Reject/Delete"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
