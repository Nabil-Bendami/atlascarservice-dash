import { Building2, Car, Gauge, Globe2, MapPinned, PlusSquare, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/traffic", label: "Traffic", icon: Globe2 },
  { to: "/cities", label: "Cities", icon: MapPinned },
  { to: "/agencies", label: "Agencies", icon: Building2 },
  { to: "/agencies/create", label: "Create Agency", icon: PlusSquare },
  { to: "/cars", label: "Cars", icon: Car },
];

export function Sidebar() {
  return (
    <aside className="surface-card sticky top-4 flex h-[calc(100vh-2rem)] flex-col p-4">
      <div className="rounded-[24px] bg-gradient-to-br from-primary to-[#7C82FF] p-5 text-white shadow-soft">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Atlas Drive</p>
        <h2 className="mt-2 text-2xl font-extrabold">Owner Dashboard</h2>
        <p className="mt-2 text-sm text-white/80">Private command center for fleet, agencies, and traffic analytics.</p>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900",
                isActive && "bg-gradient-to-r from-primary to-[#7C82FF] text-white shadow-soft",
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Performance</p>
        <p className="mt-2 text-lg font-bold text-slate-900">92% platform health</p>
        <p className="mt-1 text-sm text-muted-foreground">Strong traffic conversion across major cities.</p>
      </div>
    </aside>
  );
}
