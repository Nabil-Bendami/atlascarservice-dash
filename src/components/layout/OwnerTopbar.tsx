import { Search } from "lucide-react";
import { NotificationButton } from "@/components/layout/NotificationButton";
import { Input } from "@/components/ui/input";

export function OwnerTopbar() {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-accent">Platform overview</p>
        <h2 className="mt-2 text-3xl font-bold">Morocco rental operations</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search agencies, cities, cars..." />
        </div>
        <NotificationButton className="glass-panel h-11 w-11 border-white/10 bg-white/5" />
      </div>
    </div>
  );
}
