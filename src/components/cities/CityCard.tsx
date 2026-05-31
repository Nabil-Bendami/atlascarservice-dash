import { Building2, Car, MousePointerClick, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import type { City } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function CityCard({ city }: { city: City }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/7 to-emerald-50 px-6 py-5">
        <p className="text-sm font-semibold text-primary">{city.region}</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-900">{city.name}</h3>
      </div>
      <CardContent className="grid gap-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <CityMetric icon={Building2} label="Agencies" value={city.agenciesCount} />
          <CityMetric icon={Car} label="Cars" value={city.carsCount} />
          <CityMetric icon={Receipt} label="Reservations" value={city.reservationsCount} />
          <CityMetric icon={MousePointerClick} label="Traffic" value={city.trafficCount} />
        </div>
        <Button asChild className="w-full">
          <Link to={`/cities/${city.id}`}>View Agencies</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CityMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{formatNumber(value)}</p>
    </div>
  );
}
