import { useParams } from "react-router-dom";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityNotFound } from "@/pages/NotFoundPage";
import { useAsyncData } from "@/hooks/useAsyncData";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { carService } from "@/services/carService";

export function CarDetailsPage() {
  const { carId = "" } = useParams();
  const carQuery = useAsyncData(() => carService.getCarById(carId), [carId]);
  const historyQuery = useAsyncData(() => carService.getReservationHistory(carId), [carId]);
  const car = carQuery.data;

  if (!carId) {
    return <EntityNotFound entity="voiture" description="L'identifiant de la voiture est manquant." />;
  }

  return (
    <AsyncState loading={carQuery.loading || historyQuery.loading} error={carQuery.error ?? historyQuery.error}>
      {car ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Car profile"
            title={`${car.brand} ${car.model}`}
            subtitle={`Detailed commercial profile for ${car.agencyName} in ${car.cityName}, including revenue, click activity, and reservation history.`}
          />
          <Card>
            <CardContent className="grid gap-6 pt-6 xl:grid-cols-[1.2fr_0.8fr]">
              {car.photos?.[0] ? (
                <img
                  src={car.photos[0]}
                  alt={`${car.brand} ${car.model}`}
                  className="h-[380px] w-full rounded-3xl object-cover"
                />
              ) : (
                <div className="flex h-[380px] w-full items-center justify-center rounded-3xl bg-slate-100 text-sm font-semibold text-muted-foreground">
                  Image indisponible
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-accent">{car.agencyName}</p>
                  <h1 className="mt-2 text-3xl font-bold">{car.brand} {car.model}</h1>
                  <p className="mt-2 text-muted-foreground">{car.year} · {car.cityName}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="Price per day" value={formatCurrency(car.pricePerDay)} />
                  <Info label="Availability" value={car.availability} />
                  <Info label="Rented days" value={formatNumber(car.totalRentedDays)} />
                  <Info label="Revenue" value={formatCurrency(car.estimatedRevenue)} />
                  <Info label="Views" value={formatNumber(car.views)} />
                  <Info label="WhatsApp clicks" value={formatNumber(car.whatsappClicks)} />
                  <Info label="Phone clicks" value={formatNumber(car.phoneClicks)} />
                  <Info label="Reservations" value={formatNumber(car.reservationsCount)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <DataTable
            title="Reservation history"
            rows={historyQuery.data ?? []}
            columns={[
              { key: "customer", header: "Customer", render: (row) => <span className="font-semibold text-slate-900">{row.customerName}</span> },
              { key: "start", header: "Start", render: (row) => row.startDate },
              { key: "end", header: "End", render: (row) => row.endDate },
              { key: "days", header: "Days", render: (row) => row.days },
              { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
              { key: "status", header: "Status", render: (row) => row.status },
            ]}
          />
        </div>
      ) : (
        <EntityNotFound entity="voiture" />
      )}
    </AsyncState>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
