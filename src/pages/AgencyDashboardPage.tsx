import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OwnerProfile } from "@/types";

export function AgencyDashboardPage() {
  const [profile, setProfile] = useState<OwnerProfile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void authService
      .getSessionProfile()
      .then((currentProfile) => {
        setProfile(currentProfile);
        if (currentProfile?.role === "agency" && !currentProfile.agency_id) {
          setError("Agency login succeeded, but the linked agency record is still missing.");
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-xl">
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
    </div>
  );
}
