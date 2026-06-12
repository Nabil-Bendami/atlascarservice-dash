import { Building2, Car, MousePointerClick, PhoneCall, Search, Ticket, Wallet } from "lucide-react";
import type { TrafficMetric } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function CityTrafficPanel({ metric }: { metric: TrafficMetric | null }) {
  const selectedCity = metric as (TrafficMetric & { name?: string; city?: string }) | null;
  const cityName =
    selectedCity?.name ||
    selectedCity?.city ||
    selectedCity?.cityName ||
    "All Morocco";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{metric ? `${cityName} Traffic` : "City traffic panel"}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {metric ? (
          <>
            <PanelStat icon={MousePointerClick} label="Visitors" value={formatNumber(safeNumber(metric.visitors))} />
            <PanelStat icon={MousePointerClick} label="Unique visitors" value={formatNumber(safeNumber(metric.uniqueVisitors))} />
            <PanelStat icon={Search} label="Searches" value={formatNumber(safeNumber(metric.searches))} />
            <PanelStat icon={PhoneCall} label="Phone clicks" value={formatNumber(safeNumber(metric.phoneClicks))} />
            <PanelStat icon={Ticket} label="Reservations" value={formatNumber(safeNumber(metric.reservations))} />
            <PanelStat icon={Building2} label="Agencies" value={formatNumber(safeNumber(metric.agenciesCount))} />
            <PanelStat icon={Car} label="Cars" value={formatNumber(safeNumber(metric.carsCount))} />
            <PanelStat icon={Wallet} label="Revenue" value={formatCurrency(safeNumber(metric.revenue))} />
            <PanelStat icon={MousePointerClick} label="Conversion" value={`${safeNumber(metric.conversionRate)}%`} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-5 text-sm text-muted-foreground">
            Select a city marker on the map to open its traffic breakdown.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PanelStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}
