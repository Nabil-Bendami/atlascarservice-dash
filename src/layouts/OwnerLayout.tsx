import { Outlet } from "react-router-dom";
import { OwnerSidebar } from "@/components/layout/OwnerSidebar";
import { OwnerTopbar } from "@/components/layout/OwnerTopbar";

export function OwnerLayout() {
  return (
    <div className="page-shell lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
      <OwnerSidebar />
      <main className="pt-6 lg:pt-4">
        <OwnerTopbar />
        <Outlet />
      </main>
    </div>
  );
}
