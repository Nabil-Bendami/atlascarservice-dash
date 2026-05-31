import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    void authService
      .getSessionProfile()
      .then((profile) => setAllowed(profile?.role === "super_owner"))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-300">Checking access…</div>;
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
