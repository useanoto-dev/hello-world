import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface OrdersChartProps {
  data: Array<{
    date: string;
    orders: number;
    cancelled: number;
  }>;
}

export default function OrdersChart({ data }: OrdersChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {new Date(label).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-sm text-green-600 font-bold">
            {payload[0]?.value || 0} pedidos
          </p>
          {payload[1]?.value > 0 && (
            <p className="text-xs text-red-500">
              {payload[1].value} cancelados
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="orders" radius={[4, 4, 0, 0]} stackId="a">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill="hsl(142, 76%, 36%)" />
          ))}
        </Bar>
        <Bar dataKey="cancelled" radius={[4, 4, 0, 0]} stackId="a">
          {data.map((_, index) => (
            <Cell key={`cell-cancel-${index}`} fill="hsl(0, 84%, 60%)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
