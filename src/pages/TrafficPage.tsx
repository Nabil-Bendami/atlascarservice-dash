import { useMemo, useState } from "react";
import { Car, MessageSquareText, MousePointerClick, PhoneCall, Search, Ticket, Wallet } from "lucide-react";
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

function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function safeMetricValue<T extends number | string | null | undefined>(value: T, fallback: T) {
  return value ?? fallback;
}

export function TrafficPage() {
  const { data, loading, error, reload } = useAsyncData(() => trafficService.listTrafficByCity(), []);
  const summaryQuery = useAsyncData(() => trafficService.getSummary(), []);
  const evolutionQuery = useAsyncData(() => trafficService.getDailyEvolution(), []);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const safeData = useMemo(
    () =>
      (data ?? []).map((item) => {
        const visitors = safeNumber(item.visitors);
        const searches = safeNumber(item.searches);
        const whatsappClicks = safeNumber(item.whatsappClicks);
        const phoneClicks = safeNumber(item.phoneClicks);
        const reservations = safeNumber(item.reservations);
        const agencies = safeNumber(item.agenciesCount);
        const cars = safeNumber(item.carsCount);
        const revenue = safeNumber(item.revenue);
        const conversion = visitors > 0 ? Number(((reservations / visitors) * 100).toFixed(1)) : 0;
        const selectedCity = item;

        console.log("TRAFFIC_DEBUG", {
          visitors,
          searches,
          whatsappClicks,
          phoneClicks,
          reservations,
          agencies,
          cars,
          revenue,
          conversion,
          selectedCity,
        });

        return {
          ...item,
          cityId: String(safeMetricValue(item.cityId, "")),
          cityName: item.cityName || "All Morocco",
          region: item.region || "Morocco",
          latitude: safeNumber(item.latitude),
          longitude: safeNumber(item.longitude),
          visitors,
          uniqueVisitors: safeNumber(item.uniqueVisitors),
          searches,
          carViews: safeNumber(item.carViews),
          whatsappClicks,
          phoneClicks,
          reservations,
          agenciesCount: agencies,
          carsCount: cars,
          revenue,
          conversionRate: conversion,
        };
      }),
    [data],
  );
  const selectedMetric = useMemo(
    () => safeData.find((item) => item.cityId === selectedCityId) ?? (safeData[0] ?? null),
    [safeData, selectedCityId],
  );

  const trafficEvolution = useMemo(
    () =>
      (evolutionQuery.data ?? []).map((item) => ({
        name: item.name || "Unknown",
        visitors: safeNumber(item.visitors),
        searches: safeNumber(item.searches),
        reservations: safeNumber(item.reservations),
      })),
    [evolutionQuery.data],
  );

  const totals = {
    visitors: safeNumber(summaryQuery.data?.visitors),
    uniqueVisitors: safeNumber(summaryQuery.data?.uniqueVisitors),
    searches: safeNumber(summaryQuery.data?.searches),
    whatsapp: safeNumber(summaryQuery.data?.whatsappClicks),
    phone: safeNumber(summaryQuery.data?.phoneClicks),
    reservations: safeNumber(summaryQuery.data?.reservations),
    revenue: safeNumber(summaryQuery.data?.revenue),
    conversion: safeNumber(summaryQuery.data?.conversion),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Traffic intelligence"
        title="Morocco traffic analytics"
        subtitle="A fuller traffic command center with KPI cards, interactive city selection, map insights, and city-level performance tables."
      />
      <AsyncState
        loading={loading || summaryQuery.loading || evolutionQuery.loading}
        error={error ?? summaryQuery.error ?? evolutionQuery.error}
        isEmpty={!safeData.length}
        emptyMessage="No traffic metrics available."
        onRetry={() => {
          reload();
          summaryQuery.reload();
          evolutionQuery.reload();
        }}
      >
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-8">
            <StatCard title="Total visitors" value={formatNumber(totals.visitors)} icon={MousePointerClick} />
            <StatCard title="Unique visitors" value={formatNumber(totals.uniqueVisitors)} icon={MousePointerClick} />
            <StatCard title="Total searches" value={formatNumber(totals.searches)} icon={Search} />
            <StatCard title="WhatsApp clicks" value={formatNumber(totals.whatsapp)} icon={MessageSquareText} tone="secondary" />
            <StatCard title="Phone clicks" value={formatNumber(totals.phone)} icon={PhoneCall} />
            <StatCard title="Reservations" value={formatNumber(totals.reservations)} icon={Ticket} tone="accent" />
            <StatCard title="Revenue" value={formatCurrency(totals.revenue)} icon={Wallet} />
            <StatCard
              title="Conversion rate"
              value={`${totals.conversion}%`}
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
                  data={safeData}
                  selectedCityId={selectedMetric?.cityId}
                  onSelectCity={(metric) => setSelectedCityId(metric.cityId)}
                />
              </CardContent>
            </Card>
            <CityTrafficPanel metric={selectedMetric} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard title="Daily traffic evolution" description="Visits, searches, and reservations over the last 30 days">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trafficEvolution}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Line dataKey="visitors" stroke="#5B5FEF" strokeWidth={3} dot={{ r: 4 }} />
                    <Line dataKey="searches" stroke="#22C55E" strokeWidth={3} dot={{ r: 4 }} />
                    <Line dataKey="reservations" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Traffic by city" description="Total visitors by market">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={safeData}>
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
            rows={[...safeData].sort((a, b) => safeNumber(b.visitors) - safeNumber(a.visitors))}
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
              { key: "uniqueVisitors", header: "Unique", render: (row) => formatNumber(row.uniqueVisitors) },
              { key: "searches", header: "Searches", render: (row) => formatNumber(row.searches) },
              { key: "whatsapp", header: "WhatsApp", render: (row) => formatNumber(row.whatsappClicks) },
              { key: "phone", header: "Phone", render: (row) => formatNumber(row.phoneClicks) },
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
