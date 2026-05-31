import { CalendarClock, MapPin, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import type { Car } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function CarCard({ car }: { car: Car }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[220px_1fr]">
        <img src={car.photos[0]} alt={`${car.brand} ${car.model}`} className="h-44 w-full rounded-3xl object-cover" />
        <div className="min-w-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{car.brand} {car.model}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{car.year} · {car.agencyName}</p>
            </div>
            <Badge variant={car.availability === "available" ? "success" : car.availability === "rented" ? "default" : "secondary"}>
              {car.availability}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={MapPin} label="City" value={car.cityName} />
            <Metric icon={CalendarClock} label="Rented days" value={formatNumber(car.totalRentedDays)} />
            <Metric icon={Wallet} label="Revenue" value={formatCurrency(car.estimatedRevenue)} />
            <Metric icon={Wallet} label="Price/day" value={formatCurrency(car.pricePerDay)} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">{formatNumber(car.reservationsCount)} reservations</div>
            <Button asChild variant="outline">
              <Link to={`/cars/${car.id}`}>Open details</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
