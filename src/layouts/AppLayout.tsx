import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppLayout() {
  return (
    <div className="page-shell lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
      <Sidebar />
      <main className="min-w-0 pt-5 lg:pt-4">
        <Topbar />
        <Outlet />
      </main>
    </div>
  );
}
