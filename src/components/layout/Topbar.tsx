import { Bell, ChevronDown, Globe, LogOut, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar() {
  const navigate = useNavigate();

  return (
    <div className="surface-card mb-5 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-12 rounded-2xl pl-11" placeholder="Search agencies, cities, cars, reservations..." />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
          <Globe className="h-4 w-4 text-primary" />
          FR
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white text-slate-700 shadow-sm">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary">SO</div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-900">Super Owner</p>
            <p className="text-xs text-muted-foreground">owner@atlas.ma</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await authService.signOut();
            navigate("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
