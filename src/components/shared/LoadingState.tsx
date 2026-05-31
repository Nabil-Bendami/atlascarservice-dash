import { Card, CardContent } from "@/components/ui/card";

export function LoadingState() {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
        </div>
        <div className="mt-4 h-80 animate-pulse rounded-3xl bg-slate-100" />
      </CardContent>
    </Card>
  );
}
