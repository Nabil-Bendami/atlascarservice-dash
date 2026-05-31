import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDatum, TrafficMetric } from "@/types";
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ReservationsChart } from "@/components/dashboard/ReservationsChart";

export function CityTrafficDashboard({
  metric,
  trend,
  channelMix,
}: {
  metric: TrafficMetric;
  trend: ChartDatum[];
  channelMix: ChartDatum[];
}) {
  return (
    <div className="space-y-6">
      <DashboardStatsCards
        stats={{
          totalAgencies: metric.agenciesCount,
          totalCars: metric.carsCount,
          totalCities: 1,
          totalReservations: metric.reservations,
          availableCars: Math.max(metric.carsCount - Math.round(metric.reservations / 4), 0),
          rentedCars: Math.round(metric.reservations / 4),
          estimatedRevenue: metric.revenue,
          totalTraffic: metric.visitors,
          activeAgencies: metric.agenciesCount,
          suspendedAgencies: 0,
        }}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ReservationsChart data={trend} />
        <RevenueChart data={channelMix} title="Traffic channel mix" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{metric.cityName} traffic summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Info label="Visitors" value={metric.visitors} />
          <Info label="Searches" value={metric.searches} />
          <Info label="Car views" value={metric.carViews} />
          <Info label="WhatsApp clicks" value={metric.whatsappClicks} />
          <Info label="Phone clicks" value={metric.phoneClicks} />
          <Info label="Conversion rate" value={`${metric.conversionRate}%`} />
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
