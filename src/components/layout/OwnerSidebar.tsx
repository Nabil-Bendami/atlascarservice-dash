import { Bell, Building2, Bug, CalendarCheck, Car, Gauge, LogOut, MapPinned, Map, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { cn } from "@/lib/utils";

const premiumSupportWhatsappUrl = "https://wa.me/212647998805";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/dashboard/reservations", label: "Reservations", icon: CalendarCheck },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/reviews", label: "Reviews", icon: Star },
  { to: "/agencies/create", label: "Add Agency", icon: ShieldCheck },
  { to: "/cities", label: "Cities", icon: MapPinned },
  { to: "/cars", label: "Cars", icon: Car },
  { to: "/traffic", label: "Traffic", icon: Map },
  { to: "/dashboard/traffic-debug", label: "Traffic Debug", icon: Bug },
  { to: "/cities/casablanca", label: "Agencies", icon: Building2 },
];

export function OwnerSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="glass-panel sticky top-4 flex h-[calc(100vh-2rem)] w-full max-w-72 flex-col rounded-[28px] p-4">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-accent/15 to-transparent p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Atlas</p>
        <h1 className="mt-2 text-2xl font-extrabold">Owner Suite</h1>
        <p className="mt-2 text-sm text-muted-foreground">Private command center for the platform.</p>
      </div>

      <nav className="mt-6 flex-1 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/dashboard"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/8",
                isActive && "bg-accent text-accent-foreground shadow-lg shadow-accent/10",
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <a
        href={premiumSupportWhatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/10 transition hover:bg-accent/90"
      >
        <MessageCircle className="h-4 w-4" />
        Support premium
      </a>

      <button
        type="button"
        onClick={async () => {
          await authService.signOut();
          navigate("/login");
        }}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/5"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}
