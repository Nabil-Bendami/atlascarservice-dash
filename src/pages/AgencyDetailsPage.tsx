import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ShieldCheck, Slash, KeyRound } from "lucide-react";
import { useParams } from "react-router-dom";
import { AgencyDetailsPanel } from "@/components/agencies/AgencyDetailsPanel";
import { CarStatsCard } from "@/components/cars/CarStatsCard";
import { AsyncState } from "@/components/shared/AsyncState";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { useAsyncData } from "@/hooks/useAsyncData";
import { agencyService } from "@/services/agencyService";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function AgencyDetailsPage() {
  const { agencyId = "" } = useParams();
  const agencyQuery = useAsyncData(() => agencyService.getAgencyById(agencyId), [agencyId]);
  const carsQuery = useAsyncData(() => agencyService.getAgencyCars(agencyId), [agencyId]);
  const reservationsQuery = useAsyncData(() => agencyService.getAgencyReservations(agencyId), [agencyId]);

  const totalDays = (carsQuery.data ?? []).reduce((sum, car) => sum + car.totalRentedDays, 0);
  const totalRevenue = (carsQuery.data ?? []).reduce((sum, car) => sum + car.estimatedRevenue, 0);
  const revenueSeries = (carsQuery.data ?? []).map((car) => ({
    name: `${car.brand} ${car.model}`,
    revenue: car.estimatedRevenue,
  }));

  return (
    <AsyncState
      loading={agencyQuery.loading || carsQuery.loading || reservationsQuery.loading}
      error={agencyQuery.error ?? carsQuery.error ?? reservationsQuery.error}
    >
      {agencyQuery.data ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Agency profile"
            title={agencyQuery.data.name}
            subtitle="A professional operational profile with commercial stats, vehicle performance, and direct management actions."
            actions={
              <>
                <Button variant="outline"><ShieldCheck className="mr-2 h-4 w-4" />Verify</Button>
                <Button variant="outline"><Slash className="mr-2 h-4 w-4" />Suspend</Button>
                <Button><KeyRound className="mr-2 h-4 w-4" />Reset password</Button>
              </>
            }
          />
          <AgencyDetailsPanel agency={agencyQuery.data} />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Cars list" value={formatNumber(carsQuery.data?.length ?? 0)} icon={ShieldCheck} />
            <StatCard title="Reservations" value={formatNumber(agencyQuery.data.reservationsCount)} icon={ShieldCheck} />
            <StatCard title="Rental days" value={formatNumber(totalDays)} icon={ShieldCheck} tone="secondary" />
            <StatCard title="Estimated revenue" value={formatCurrency(totalRevenue)} icon={ShieldCheck} tone="accent" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
            <ChartCard title="Revenue by car" description="Top performing vehicles in this agency">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueSeries}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" hide />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#5B5FEF" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <Card>
              <CardContent className="grid gap-4 p-6">
                <Info label="Views" value={formatNumber(agencyQuery.data.views)} />
                <Info label="Conversion rate" value={`${agencyQuery.data.conversionRate}%`} />
                <Info label="Status" value={agencyQuery.data.status} />
                <Info label="Verification" value={agencyQuery.data.verified ? "Verified" : "Pending"} />
              </CardContent>
            </Card>
          </div>

          <DataTable
            title="Reservations"
            rows={reservationsQuery.data ?? []}
            columns={[
              { key: "customer", header: "Customer", render: (row) => <span className="font-semibold text-slate-900">{row.customerName}</span> },
              { key: "start", header: "Start date", render: (row) => row.startDate },
              { key: "end", header: "End date", render: (row) => row.endDate },
              { key: "days", header: "Days", render: (row) => row.days },
              { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
              { key: "status", header: "Status", render: (row) => row.status },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-2">
            {(carsQuery.data ?? []).map((car) => (
              <CarStatsCard key={car.id} car={car} />
            ))}
          </div>
        </div>
      ) : null}
    </AsyncState>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
