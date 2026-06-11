import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { agencyService } from "@/services/agencyService";
import type { OwnerProfile, ReservationHistoryItem } from "@/types";

export function AgencyDashboardPage() {
  const [profile, setProfile] = useState<OwnerProfile | null | undefined>(undefined);
  const [reservations, setReservations] = useState<ReservationHistoryItem[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void authService
      .getSessionProfile()
      .then((currentProfile) => {
        setProfile(currentProfile);
        if (currentProfile?.role === "agency" && !currentProfile.agency_id) {
          setError("Agency login succeeded, but the linked agency record is still missing.");
        }

        if (currentProfile?.role === "agency" && currentProfile.agency_id) {
          setReservationsLoading(true);
          void agencyService
            .getAgencyReservations(currentProfile.agency_id)
            .then(setReservations)
            .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load agency reservations."))
            .finally(() => setReservationsLoading(false));
        }
      })
      .catch((reason) => {
        setProfile(null);
        setError(reason instanceof Error ? reason.message : "Unable to load the current profile.");
      });
  }, []);

  if (profile === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-300">Loading agency access…</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === "super_owner") {
    return <Navigate to="/dashboard" replace />;
  }

  if (profile.role !== "agency") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Agency dashboard"
          title="Verified reservations"
          subtitle="Only owner-verified reservations for your agency appear here. Pending and rejected requests stay hidden."
        />

        <Card>
        <CardHeader>
          <p className="text-sm uppercase tracking-[0.35em] text-primary">Agency access</p>
          <CardTitle className="text-3xl text-slate-900">Agency profile resolved</CardTitle>
          <CardDescription>
            The session is authenticated and the public profile has been matched to the agency account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div>
            <strong>Email:</strong> {profile.email || "Unknown"}
          </div>
          <div>
            <strong>Role:</strong> {profile.role}
          </div>
          <div>
            <strong>Agency ID:</strong> {profile.agency_id || "Missing"}
          </div>
          {error ? <p className="text-rose-600">{error}</p> : null}
          {profile.agency_id ? (
            <Button asChild>
              <Link to={`/agencies/${profile.agency_id}`}>Open agency record</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

        <DataTable
          title={reservationsLoading ? "Loading reservations..." : "Reservations"}
          rows={reservations}
          columns={[
            { key: "customer", header: "Client", render: (row) => <span className="font-semibold text-slate-900">{row.customerName}</span> },
            { key: "phone", header: "Phone", render: (row) => row.customerPhone || "Not provided" },
            { key: "city", header: "City", render: (row) => row.city || "Not provided" },
            { key: "car", header: "Car", render: (row) => row.carName || "Not provided" },
            { key: "start", header: "Start date", render: (row) => row.startDate },
            { key: "end", header: "End date", render: (row) => row.endDate },
            { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
            { key: "message", header: "Message", render: (row) => row.message || "No message" },
          ]}
        />

        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Showing {formatNumber(reservations.length)} verified reservation{reservations.length === 1 ? "" : "s"}.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
