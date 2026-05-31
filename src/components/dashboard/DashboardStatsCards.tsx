import { Activity, Banknote, Building2, Car, MapPinned, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats } from "@/types";

const iconMap = [Building2, Car, MapPinned, ShoppingBag, Car, Car, Banknote, Activity, Building2, Building2];

const labels = [
  "Total agencies",
  "Total cars",
  "Total cities",
  "Reservations",
  "Available cars",
  "Rented cars",
  "Estimated revenue",
  "Total traffic",
  "Active agencies",
  "Suspended agencies",
];

export function DashboardStatsCards({ stats }: { stats: DashboardStats }) {
  const values = [
    stats.totalAgencies,
    stats.totalCars,
    stats.totalCities,
    stats.totalReservations,
    stats.availableCars,
    stats.rentedCars,
    stats.estimatedRevenue,
    stats.totalTraffic,
    stats.activeAgencies,
    stats.suspendedAgencies,
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {values.map((value, index) => {
        const Icon = iconMap[index];
        return (
          <Card key={labels[index]} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{labels[index]}</CardTitle>
                <div className="rounded-2xl bg-accent/15 p-2 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold">
                {labels[index] === "Estimated revenue" ? formatCurrency(Number(value)) : formatNumber(Number(value))}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
