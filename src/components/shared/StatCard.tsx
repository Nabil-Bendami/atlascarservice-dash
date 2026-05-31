import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  tone = "primary",
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "primary" | "secondary" | "accent";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-emerald-50 text-emerald-600",
    accent: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
            {trend ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                {trend}
              </div>
            ) : null}
          </div>
          <div className={`rounded-2xl p-3 ${toneClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
