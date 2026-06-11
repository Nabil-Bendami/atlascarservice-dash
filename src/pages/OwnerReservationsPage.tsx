import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AsyncState } from "@/components/shared/AsyncState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncData } from "@/hooks/useAsyncData";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { reservationService, type OwnerReservation, type OwnerReservationFilter } from "@/services/reservationService";

const filters: Array<{ label: string; value: OwnerReservationFilter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
];

function formatDate(value: string | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function getStatusBadge(status: string) {
  if (status === "verified") return <Badge variant="success">Verified</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge>Pending</Badge>;
}

function getStatusIcon(status: string) {
  if (status === "verified") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "rejected") return <XCircle className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

export function OwnerReservationsPage() {
  const [searchParams] = useSearchParams();
  const highlightedReservationId = searchParams.get("reservation_id");
  const [activeFilter, setActiveFilter] = useState<OwnerReservationFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reservationsQuery = useAsyncData(() => reservationService.listOwnerReservations(), []);

  const reservations = reservationsQuery.data ?? [];
  const filteredReservations = useMemo(() => {
    if (activeFilter === "all") return reservations;
    return reservations.filter((reservation) => reservation.status === activeFilter);
  }, [activeFilter, reservations]);

  const hasQueryError = Boolean(reservationsQuery.error);
  const counts = useMemo(
    () => ({
      all: hasQueryError ? null : reservations.length,
      pending: hasQueryError ? null : reservations.filter((reservation) => reservation.status === "pending").length,
      verified: hasQueryError ? null : reservations.filter((reservation) => reservation.status === "verified").length,
      rejected: hasQueryError ? null : reservations.filter((reservation) => reservation.status === "rejected").length,
    }),
    [hasQueryError, reservations],
  );

  async function updateReservation(reservation: OwnerReservation, action: "verify" | "reject") {
    try {
      setUpdatingId(reservation.id);
      setActionError(null);

      if (action === "verify") {
        await reservationService.verifyReservation(reservation.id);
      } else {
        await reservationService.rejectReservation(reservation.id);
      }

      await reservationsQuery.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update reservation.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner review"
        title="Reservations"
        subtitle="Review new reservations before they are released to the related agency."
        actions={
          <Button variant="outline" onClick={() => void reservationsQuery.reload()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReservationMetric label="All reservations" value={counts.all} />
        <ReservationMetric label="Pending" value={counts.pending} tone="pending" />
        <ReservationMetric label="Verified" value={counts.verified} tone="verified" />
        <ReservationMetric label="Rejected" value={counts.rejected} tone="rejected" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.value
                    ? "bg-primary text-white shadow-soft"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {filter.label}
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{counts[filter.value]}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </div>
      ) : null}

      <AsyncState
        loading={reservationsQuery.loading}
        error={reservationsQuery.error}
        isEmpty={!reservationsQuery.loading && reservations.length === 0}
        emptyMessage="No reservations have been created yet."
        onRetry={() => void reservationsQuery.reload()}
      >
        {filteredReservations.length ? (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                isHighlighted={reservation.id === highlightedReservationId}
                updating={updatingId === reservation.id}
                onVerify={() => void updateReservation(reservation, "verify")}
                onReject={() => void updateReservation(reservation, "reject")}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No matching reservations" description="Try a different reservation status filter." />
        )}
      </AsyncState>
    </div>
  );
}

function ReservationMetric({
  label,
  value,
  tone = "all",
}: {
  label: string;
  value: number | null;
  tone?: "all" | "pending" | "verified" | "rejected";
}) {
  const toneClasses = {
    all: "bg-primary/10 text-primary",
    pending: "bg-amber-50 text-amber-600",
    verified: "bg-emerald-50 text-emerald-600",
    rejected: "bg-rose-50 text-rose-600",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{value === null ? "—" : formatNumber(value)}</p>
        </div>
        <div className={`rounded-2xl p-3 ${toneClasses}`}>
          <CalendarCheck className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ReservationCard({
  reservation,
  isHighlighted,
  updating,
  onVerify,
  onReject,
}: {
  reservation: OwnerReservation;
  isHighlighted: boolean;
  updating: boolean;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <Card className={isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : undefined}>
      <CardContent className="p-0">
        <div className="grid gap-0 overflow-hidden rounded-[inherit] xl:grid-cols-[260px_1fr]">
          <div className="min-h-48 bg-slate-100">
            {reservation.carImage ? (
              <img src={reservation.carImage} alt={reservation.carName} className="h-full min-h-48 w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-48 items-center justify-center text-slate-400">
                <CalendarCheck className="h-10 w-10" />
              </div>
            )}
          </div>

          <div className="space-y-5 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-primary">
                  {getStatusIcon(reservation.status)}
                  <span className="text-xs font-bold uppercase tracking-[0.22em]">Reservation request</span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{reservation.carName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reservation.agencyName} · {reservation.agencyCity}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(reservation.status)}
                {reservation.status === "pending" ? (
                  <>
                    <Button size="sm" variant="success" disabled={updating} onClick={onVerify}>
                      Verify
                    </Button>
                    <Button size="sm" variant="destructive" disabled={updating} onClick={onReject}>
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Info label="Client name" value={reservation.clientName} />
              <Info label="Phone" value={reservation.clientPhone} />
              <Info label="Email" value={reservation.clientEmail} />
              <Info label="City" value={reservation.city} />
              <Info label="Start date" value={formatDate(reservation.startDate)} />
              <Info label="End date" value={formatDate(reservation.endDate)} />
              <Info label="Total days" value={formatNumber(reservation.totalDays)} />
              <Info label="Total price" value={formatCurrency(reservation.totalPrice)} />
              <Info label="Status" value={reservation.status} />
              <Info label="Created at" value={formatDate(reservation.createdAt)} />
              <Info label="Car" value={reservation.carName} />
              <Info label="Agency" value={reservation.agencyName} />
              <Info label="Message" value={reservation.message} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
