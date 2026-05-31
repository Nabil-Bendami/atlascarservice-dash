import { useMemo, useState } from "react";
import { Car, MessageSquareText, MousePointerClick, PhoneCall, Search, Ticket } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CityTrafficPanel } from "@/components/traffic/CityTrafficPanel";
import { TrafficMap } from "@/components/traffic/TrafficMap";
import { AsyncState } from "@/components/shared/AsyncState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { trafficService } from "@/services/trafficService";

export function TrafficPage() {
  const { data, loading, error, reload } = useAsyncData(() => trafficService.listTrafficByCity(), []);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const selectedMetric = useMemo(
    () => (data ?? []).find((item) => item.cityId === selectedCityId) ?? (data?.[0] ?? null),
    [data, selectedCityId],
  );

  const totals = useMemo(() => {
    const source = data ?? [];
    return source.reduce(
      (acc, item) => ({
        visitors: acc.visitors + item.visitors,
        searches: acc.searches + item.searches,
        whatsapp: acc.whatsapp + item.whatsappClicks,
        phone: acc.phone + item.phoneClicks,
        reservations: acc.reservations + item.reservations,
      }),
      { visitors: 0, searches: 0, whatsapp: 0, phone: 0, reservations: 0 },
    );
  }, [data]);

  const trafficEvolution = useMemo(
    () =>
      (data ?? []).map((item, index) => ({
        name: item.cityName,
        visitors: item.visitors,
        searches: item.searches,
        reservations: item.reservations + index * 3,
      })),
    [data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Traffic intelligence"
        title="Morocco traffic analytics"
        subtitle="A fuller traffic command center with KPI cards, interactive city selection, map insights, and city-level performance tables."
      />
      <AsyncState loading={loading} error={error} isEmpty={!data?.length} emptyMessage="No traffic metrics available." onRetry={reload}>
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
            <StatCard title="Total visitors" value={formatNumber(totals.visitors)} icon={MousePointerClick} trend="+11% traffic" />
            <StatCard title="Total searches" value={formatNumber(totals.searches)} icon={Search} trend="+9% demand" />
            <StatCard title="WhatsApp clicks" value={formatNumber(totals.whatsapp)} icon={MessageSquareText} tone="secondary" />
            <StatCard title="Phone clicks" value={formatNumber(totals.phone)} icon={PhoneCall} />
            <StatCard title="Reservations" value={formatNumber(totals.reservations)} icon={Ticket} tone="accent" />
            <StatCard
              title="Conversion rate"
              value={`${((totals.reservations / Math.max(totals.visitors, 1)) * 100).toFixed(1)}%`}
              icon={Car}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Morocco map</CardTitle>
              </CardHeader>
              <CardContent>
                <TrafficMap
                  data={data ?? []}
                  selectedCityId={selectedMetric?.cityId}
                  onSelectCity={(metric) => setSelectedCityId(metric.cityId)}
                />
              </CardContent>
            </Card>
            <CityTrafficPanel metric={selectedMetric} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard title="Traffic evolution" description="Visitors and searches by city">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trafficEvolution}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Line dataKey="visitors" stroke="#5B5FEF" strokeWidth={3} dot={{ r: 4 }} />
                    <Line dataKey="searches" stroke="#22C55E" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Traffic by city" description="Total visitors by market">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data ?? []}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="cityName" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="visitors" fill="#5B5FEF" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <DataTable
            title="Top active cities"
            rows={[...(data ?? [])].sort((a, b) => b.visitors - a.visitors)}
            columns={[
              {
                key: "city",
                header: "City",
                render: (row) => (
                  <button className="font-semibold text-primary" onClick={() => setSelectedCityId(row.cityId)}>
                    {row.cityName}
                  </button>
                ),
              },
              { key: "visitors", header: "Visitors", render: (row) => formatNumber(row.visitors) },
              { key: "searches", header: "Searches", render: (row) => formatNumber(row.searches) },
              { key: "reservations", header: "Reservations", render: (row) => formatNumber(row.reservations) },
              { key: "conversion", header: "Conversion", render: (row) => `${row.conversionRate}%` },
              { key: "revenue", header: "Revenue", render: (row) => formatCurrency(row.revenue) },
            ]}
          />
        </div>
      </AsyncState>
    </div>
  );
}
