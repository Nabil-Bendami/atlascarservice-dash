import { Building2, Car, MousePointerClick, PhoneCall, Search, Ticket, Wallet } from "lucide-react";
import type { TrafficMetric } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function CityTrafficPanel({ metric }: { metric: TrafficMetric | null }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{metric ? `${metric.cityName} Traffic` : "City traffic panel"}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {metric ? (
          <>
            <PanelStat icon={MousePointerClick} label="Visitors" value={formatNumber(metric.visitors)} />
            <PanelStat icon={Search} label="Searches" value={formatNumber(metric.searches)} />
            <PanelStat icon={PhoneCall} label="Phone clicks" value={formatNumber(metric.phoneClicks)} />
            <PanelStat icon={Ticket} label="Reservations" value={formatNumber(metric.reservations)} />
            <PanelStat icon={Building2} label="Agencies" value={formatNumber(metric.agenciesCount)} />
            <PanelStat icon={Car} label="Cars" value={formatNumber(metric.carsCount)} />
            <PanelStat icon={Wallet} label="Revenue" value={formatCurrency(metric.revenue)} />
            <PanelStat icon={MousePointerClick} label="Conversion" value={`${metric.conversionRate}%`} />
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
