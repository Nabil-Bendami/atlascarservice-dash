import { useParams } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EntityNotFound } from "@/pages/NotFoundPage";
import { useAsyncData } from "@/hooks/useAsyncData";
import { formatCurrency } from "@/lib/utils";
import { reservationService } from "@/services/reservationService";

function formatDate(value: string | null) {
  if (!value) return "Non renseigné";

  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusBadge(status: string) {
  if (status === "verified") return <Badge variant="success">Vérifiée</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejetée</Badge>;
  return <Badge>En attente</Badge>;
}

export function ReservationDetailsPage() {
  const { reservationId = "" } = useParams();
  const reservationQuery = useAsyncData(() => reservationService.getOwnerReservationById(reservationId), [reservationId]);
  const reservation = reservationQuery.data;

  if (!reservationId) {
    return <EntityNotFound entity="réservation" description="L'identifiant de la réservation est manquant." />;
  }

  return (
    <AsyncState loading={reservationQuery.loading} error={reservationQuery.error} onRetry={reservationQuery.reload}>
      {reservation ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Reservation"
            title={reservation.clientName}
            subtitle={`${reservation.carName} · ${reservation.agencyName}`}
          />

          <Card>
            <CardContent className="grid gap-6 p-6 xl:grid-cols-[280px_1fr]">
              <div className="flex min-h-56 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <CalendarCheck className="h-12 w-12" />
              </div>
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  {getStatusBadge(reservation.status)}
                  <span className="text-sm text-muted-foreground">Créée le {formatDate(reservation.createdAt)}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="Client" value={reservation.clientName} />
                  <Info label="Téléphone" value={reservation.clientPhone} />
                  <Info label="Email" value={reservation.clientEmail} />
                  <Info label="Ville" value={reservation.city} />
                  <Info label="Début" value={formatDate(reservation.startDate)} />
                  <Info label="Fin" value={formatDate(reservation.endDate)} />
                  <Info label="Total" value={formatCurrency(reservation.totalPrice)} />
                  <Info label="Agence" value={reservation.agencyName} />
                </div>
                <div className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Message</p>
                  <p className="mt-2 text-sm text-slate-900">{reservation.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EntityNotFound entity="réservation" />
      )}
    </AsyncState>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
