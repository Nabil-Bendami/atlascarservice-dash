import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Car } from "@/types";

export function CarStatsCard({ car }: { car: Car }) {
  return (
    <Card className="overflow-hidden">
      <img src={car.photos[0]} alt={`${car.brand} ${car.model}`} className="h-48 w-full object-cover" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{car.brand} {car.model}</h3>
            <p className="text-sm text-muted-foreground">{car.year} · {car.agencyName}</p>
          </div>
          <Badge variant={car.availability === "available" ? "success" : car.availability === "rented" ? "default" : "secondary"}>
            {car.availability}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Price/day" value={formatCurrency(car.pricePerDay)} />
          <Metric label="Reservations" value={formatNumber(car.reservationsCount)} />
          <Metric label="Rented days" value={formatNumber(car.totalRentedDays)} />
          <Metric label="Revenue" value={formatCurrency(car.estimatedRevenue)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
