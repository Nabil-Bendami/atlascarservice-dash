import { useEffect, useState } from "react";
import { Activity, Building2, Car, Ticket, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { AsyncState } from "@/components/shared/AsyncState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { statsService } from "@/services/statsService";
import { agencyService } from "@/services/agencyService";
import type { ChartDatum, DashboardStats } from "@/types";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<Record<string, ChartDatum[]>>({});
  const [agencies, setAgencies] = useState(awaitableEmptyAgencyArray());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [dashboardStats, reservationsByMonth, topCities, topAgencies, topRentedCars, revenueByCity, agenciesData] =
          await Promise.all([
            statsService.getDashboardStats(),
            statsService.getReservationsByMonth(),
            statsService.getTopCities(),
            statsService.getTopAgencies(),
            statsService.getTopRentedCars(),
            statsService.getRevenueByCity(),
            agencyService.listAgencies(),
          ]);

        setStats(dashboardStats);
        setCharts({ reservationsByMonth, topCities, topAgencies, topRentedCars, revenueByCity });
        setAgencies(agenciesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <AsyncState loading={loading} error={error}>
      {stats ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Overview"
            title="Owner dashboard"
            subtitle="A premium overview of agencies, cars, reservations, revenue, and traffic performance across Morocco."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total agencies" value={formatNumber(stats.totalAgencies)} icon={Building2} trend="+12% this month" />
            <StatCard title="Total cars" value={formatNumber(stats.totalCars)} icon={Car} trend="+8% fleet growth" />
            <StatCard title="Reservations" value={formatNumber(stats.totalReservations)} icon={Ticket} trend="+18% bookings" tone="secondary" />
            <StatCard title="Total revenue" value={formatCurrency(stats.estimatedRevenue)} icon={Wallet} trend="+14% income" tone="accent" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <ChartCard title="Visitor insights" description="Traffic and rental demand trend">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(charts.revenueByCity ?? []).map((item, index) => ({ ...item, visitors: (charts.reservationsByMonth?.[index]?.value ?? 0) * 95 }))}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="visitors" stroke="#5B5FEF" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <Card>
              <CardHeader>
                <CardTitle>Latest activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agencies.slice(0, 4).map((agency) => (
                  <div key={agency.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{agency.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agency.cityName} · {formatNumber(agency.reservationsCount)} reservations · {formatCurrency(agency.estimatedRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard title="Reservations by month" description="Monthly booking performance">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.reservationsByMonth ?? []}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#5B5FEF" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Cars by city" description="Fleet distribution by top cities">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.topCities ?? []} dataKey="value" nameKey="name" innerRadius={72} outerRadius={110} fill="#5B5FEF" />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <DataTable
              title="Top agencies"
              rows={agencies.slice(0, 5)}
              columns={[
                { key: "name", header: "Agency", render: (agency) => <div className="font-semibold text-slate-900">{agency.name}</div> },
                { key: "city", header: "City", render: (agency) => agency.cityName },
                { key: "cars", header: "Cars", render: (agency) => formatNumber(agency.carsCount) },
                { key: "reservations", header: "Reservations", render: (agency) => formatNumber(agency.reservationsCount) },
                { key: "revenue", header: "Revenue", render: (agency) => formatCurrency(agency.estimatedRevenue) },
                {
                  key: "status",
                  header: "Status",
                  render: (agency) => <Badge variant={agency.status === "active" ? "success" : "destructive"}>{agency.status}</Badge>,
                },
              ]}
            />

            <Card>
              <CardHeader>
                <CardTitle>Top rented cars</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(charts.topRentedCars ?? []).slice(0, 5).map((car) => (
                  <div key={car.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{car.name}</p>
                      <p className="text-sm text-muted-foreground">High-performing inventory</p>
                    </div>
                    <Badge>{formatNumber(car.value)} rentals</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </AsyncState>
  );
}

function awaitableEmptyAgencyArray() {
  return [] as Awaited<ReturnType<typeof agencyService.listAgencies>>;
}
