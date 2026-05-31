import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import type { OwnerProfile } from "@/types";

export function ProtectedRoute() {
  const location = useLocation();
  const [profile, setProfile] = useState<OwnerProfile | null | undefined>(undefined);

  useEffect(() => {
    void authService.getSessionProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  if (profile === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-300">Loading dashboard…</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
