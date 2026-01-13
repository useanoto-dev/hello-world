import React from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/hooks/useTheme";

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

interface SalesPeriodChartProps {
  data: SalesData[];
}

export default function SalesPeriodChart({ data }: SalesPeriodChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Darker green for both modes
  const chartColor = isDark ? "#22c55e" : "#15803d";
  const chartColorGlow = isDark ? "#16a34a" : "#15803d";

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/60 rounded-md p-2 shadow-lg dark:bg-black/80 dark:border-white/10 dark:backdrop-blur-sm">
          <p className="text-[11px] font-medium text-foreground mb-0.5">
            {format(parseISO(label), "dd 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="text-xs font-semibold dark:text-[#4ade80] dark:drop-shadow-[0_0_4px_rgba(74,222,128,0.5)] text-green-600">
            R$ {payload[0].value.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {payload[1]?.value || 0} pedidos
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenueChart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={isDark ? 0.4 : 0.2} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "hsl(var(--border))"} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fill: isDark ? "rgba(255,255,255,0.5)" : "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: isDark ? "rgba(255,255,255,0.5)" : "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}`}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={chartColor}
          strokeWidth={1.5}
          fill="url(#colorRevenueChart)"
          style={isDark ? { filter: `drop-shadow(0 0 4px ${chartColorGlow})` } : undefined}
        />
        <Area
          type="monotone"
          dataKey="orders"
          stroke="transparent"
          fill="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
