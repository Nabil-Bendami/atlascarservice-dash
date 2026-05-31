import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDatum } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function RevenueChart({ data, title }: { data: ChartDatum[]; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="name" stroke="#9fb2cc" />
            <YAxis stroke="#9fb2cc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f1c2f", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)" }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Bar dataKey="value" fill="#d4a94d" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
