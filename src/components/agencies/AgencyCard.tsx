import { Link } from "react-router-dom";
import { Building2, MapPin, Phone, Trash2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Agency } from "@/types";

type AgencyCardProps = {
  agency: Agency;
  isUpdating?: boolean;
  isDeleting?: boolean;
  canDelete?: boolean;
  onToggleBlocked?: (agency: Agency, nextBlockedState: boolean) => Promise<void> | void;
  onDelete?: (agency: Agency) => void;
};

export function AgencyCard({
  agency,
  isUpdating = false,
  isDeleting = false,
  canDelete = false,
  onToggleBlocked,
  onDelete,
}: AgencyCardProps) {
  const isSuspended = agency.isSuspended || agency.status === "suspended";

  async function handleToggleBlocked() {
    if (!onToggleBlocked) return;

    const confirmed = window.confirm(
      isSuspended
        ? "Are you sure you want to unblock this agency? Its ads and cars will appear again on the public site."
        : "Are you sure you want to block this agency? Its ads and cars will no longer appear on the public site.",
    );

    if (!confirmed) return;
    await onToggleBlocked(agency, !isSuspended);
  }

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
          <div className="flex flex-wrap justify-end gap-2">
            {agency.isBlocked ? <Badge variant="destructive">Blocked</Badge> : null}
            <Badge variant={agency.verified ? "success" : "secondary"}>
              {agency.verified ? "Verified" : "Pending"}
            </Badge>
            <Badge variant={isSuspended ? "destructive" : "success"}>{isSuspended ? "Suspended" : "Active"}</Badge>
            <Badge variant={agency.status === "active" ? "default" : "destructive"}>status: {agency.status}</Badge>
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Button asChild className="flex-1">
            <Link to={`/agencies/${agency.id}`}>Voir détails</Link>
          </Button>
          <Button
            type="button"
            variant={isSuspended ? "success" : "destructive"}
            className="flex-1"
            disabled={isUpdating || isDeleting}
            onClick={() => void handleToggleBlocked()}
          >
            {isUpdating ? "Updating..." : isSuspended ? "Unblock agency" : "Block agency"}
          </Button>
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              className="flex-1 sm:col-span-2 xl:col-span-1"
              disabled={isUpdating || isDeleting}
              onClick={() => onDelete?.(agency)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete agency"}
            </Button>
          ) : null}
        </div>
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
