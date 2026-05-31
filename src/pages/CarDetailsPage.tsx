import { useParams } from "react-router-dom";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsyncData } from "@/hooks/useAsyncData";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { carService } from "@/services/carService";

export function CarDetailsPage() {
  const { carId = "" } = useParams();
  const carQuery = useAsyncData(() => carService.getCarById(carId), [carId]);
  const historyQuery = useAsyncData(() => carService.getReservationHistory(carId), [carId]);

  return (
    <AsyncState loading={carQuery.loading || historyQuery.loading} error={carQuery.error ?? historyQuery.error}>
      {carQuery.data ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Car profile"
            title={`${carQuery.data.brand} ${carQuery.data.model}`}
            subtitle={`Detailed commercial profile for ${carQuery.data.agencyName} in ${carQuery.data.cityName}, including revenue, click activity, and reservation history.`}
          />
          <Card>
            <CardContent className="grid gap-6 pt-6 xl:grid-cols-[1.2fr_0.8fr]">
              <img
                src={carQuery.data.photos[0]}
                alt={`${carQuery.data.brand} ${carQuery.data.model}`}
                className="h-[380px] w-full rounded-3xl object-cover"
              />
              <div className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-accent">{carQuery.data.agencyName}</p>
                  <h1 className="mt-2 text-3xl font-bold">{carQuery.data.brand} {carQuery.data.model}</h1>
                  <p className="mt-2 text-muted-foreground">{carQuery.data.year} · {carQuery.data.cityName}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="Price per day" value={formatCurrency(carQuery.data.pricePerDay)} />
                  <Info label="Availability" value={carQuery.data.availability} />
                  <Info label="Rented days" value={formatNumber(carQuery.data.totalRentedDays)} />
                  <Info label="Revenue" value={formatCurrency(carQuery.data.estimatedRevenue)} />
                  <Info label="Views" value={formatNumber(carQuery.data.views)} />
                  <Info label="WhatsApp clicks" value={formatNumber(carQuery.data.whatsappClicks)} />
                  <Info label="Phone clicks" value={formatNumber(carQuery.data.phoneClicks)} />
                  <Info label="Reservations" value={formatNumber(carQuery.data.reservationsCount)} />
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
      ) : null}
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
