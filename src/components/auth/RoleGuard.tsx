import { useEffect, useState } from "react";
import { AccessDeniedPage } from "@/pages/NotFoundPage";
import { authService } from "@/services/authService";
import type { OwnerRole } from "@/types";

export function RoleGuard({
  children,
  allowedRoles = ["super_owner"],
}: {
  children: React.ReactNode;
  allowedRoles?: OwnerRole[];
}) {
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    void authService
      .getSessionProfile()
      .then((profile) => setAllowed(Boolean(profile?.role && allowedRoles.includes(profile.role))))
      .catch(() => setAllowed(false));
  }, [allowedRoles]);

  if (allowed === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-300">Checking access…</div>;
  }

  if (!allowed) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
