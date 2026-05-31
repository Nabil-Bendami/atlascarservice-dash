import type { Agency } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function AgencyDetailsPanel({ agency }: { agency: Agency }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${agency.coverImage})` }} />
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 lg:flex-row">
          <div className="flex items-center gap-4">
            <img src={agency.logo} alt={agency.name} className="h-16 w-16 rounded-2xl object-cover" />
            <div>
                <CardTitle className="text-2xl">{agency.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{agency.address}</p>
              </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={agency.verified ? "success" : "secondary"}>
              {agency.verified ? "Verified" : "Pending verification"}
            </Badge>
            <Badge variant={agency.status === "active" ? "default" : "destructive"}>{agency.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Phone" value={agency.phone} />
        <Info label="WhatsApp" value={agency.whatsapp} />
        <Info label="Reservations" value={formatNumber(agency.reservationsCount)} />
        <Info label="Revenue" value={formatCurrency(agency.estimatedRevenue)} />
        <Info label="Cars count" value={formatNumber(agency.carsCount)} />
        <Info label="Views" value={formatNumber(agency.views)} />
        <Info label="Conversion" value={`${agency.conversionRate}%`} />
        <Info label="Region" value={agency.region} />
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
