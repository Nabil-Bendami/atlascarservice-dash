import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDatum, TrafficMetric } from "@/types";
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ReservationsChart } from "@/components/dashboard/ReservationsChart";

function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function safeChartData(data: ChartDatum[]) {
  return (data ?? []).map((item) => ({
    name: item.name || "Unknown",
    value: safeNumber(item.value),
  }));
}

export function CityTrafficDashboard({
  metric,
  trend,
  channelMix,
}: {
  metric: TrafficMetric;
  trend: ChartDatum[];
  channelMix: ChartDatum[];
}) {
  const visitors = safeNumber(metric.visitors);
  const searches = safeNumber(metric.searches);
  const whatsappClicks = safeNumber(metric.whatsappClicks);
  const phoneClicks = safeNumber(metric.phoneClicks);
  const reservations = safeNumber(metric.reservations);
  const agencies = safeNumber(metric.agenciesCount);
  const cars = safeNumber(metric.carsCount);
  const revenue = safeNumber(metric.revenue);
  const conversion = visitors > 0 ? Number(((reservations / visitors) * 100).toFixed(1)) : 0;
  const cityName = metric.cityName || "All Morocco";
  const safeTrend = safeChartData(trend);
  const safeChannelMix = safeChartData(channelMix);

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
    selectedCity: metric,
  });

  return (
    <div className="space-y-6">
      <DashboardStatsCards
        stats={{
          totalAgencies: agencies,
          totalCars: cars,
          totalCities: 1,
          totalReservations: reservations,
          availableCars: Math.max(cars - Math.round(reservations / 4), 0),
          rentedCars: Math.round(reservations / 4),
          estimatedRevenue: revenue,
          totalTraffic: visitors,
          activeAgencies: agencies,
          suspendedAgencies: 0,
        }}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ReservationsChart data={safeTrend} />
        <RevenueChart data={safeChannelMix} title="Traffic channel mix" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{cityName} traffic summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Info label="Visitors" value={visitors} />
          <Info label="Searches" value={searches} />
          <Info label="Car views" value={safeNumber(metric.carViews)} />
          <Info label="WhatsApp clicks" value={whatsappClicks} />
          <Info label="Phone clicks" value={phoneClicks} />
          <Info label="Conversion rate" value={`${conversion}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
