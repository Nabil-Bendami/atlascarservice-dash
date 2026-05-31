import { Link } from "react-router-dom";
import { Building2, MapPin, Phone, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Agency } from "@/types";

export function AgencyCard({ agency }: { agency: Agency }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${agency.coverImage})` }} />
      <CardContent className="relative p-6 pt-0">
        <img src={agency.logo} alt={agency.name} className="-mt-8 h-16 w-16 rounded-2xl border-4 border-white object-cover shadow-soft" />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{agency.name}</h3>
            <p className="text-sm text-muted-foreground">{agency.address}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={agency.verified ? "success" : "secondary"}>
              {agency.verified ? "Verified" : "Pending"}
            </Badge>
            <Badge variant={agency.status === "active" ? "default" : "destructive"}>{agency.status}</Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Metric icon={Phone} label="Phone" value={agency.phone} />
          <Metric icon={MapPin} label="WhatsApp" value={agency.whatsapp} />
          <Metric icon={Building2} label="Cars" value={formatNumber(agency.carsCount)} />
          <Metric icon={Building2} label="Reservations" value={formatNumber(agency.reservationsCount)} />
          <Metric icon={Wallet} label="Revenue" value={formatCurrency(agency.estimatedRevenue)} />
          <Metric icon={Wallet} label="Conversion" value={`${agency.conversionRate}%`} />
        </div>

        <Button asChild className="mt-5 w-full">
          <Link to={`/agencies/${agency.id}`}>Voir détails</Link>
        </Button>
      </CardContent>
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
    <div className="rounded-2xl border border-border bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
