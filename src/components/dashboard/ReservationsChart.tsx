import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDatum } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function ReservationsChart({ data }: { data: ChartDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservations by month</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="reservationsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4a94d" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#d4a94d" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="name" stroke="#9fb2cc" />
            <YAxis stroke="#9fb2cc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f1c2f", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)" }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Area type="monotone" dataKey="value" stroke="#d4a94d" fill="url(#reservationsFill)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
