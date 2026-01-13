import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTheme } from "@/hooks/useTheme";

interface TopProductsChartProps {
  data: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

// Light mode colors
const COLORS_LIGHT = [
  "#f59e0b", // amber
  "#16a34a", // green
  "#2563eb", // blue
  "#7c3aed", // violet
  "#ea580c", // orange
];

// Dark mode - Neon green variations
const COLORS_DARK = [
  "#4ade80", // neon green
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#fbbf24", // amber
  "#fb7185", // rose
];

export default function TopProductsChart({ data }: TopProductsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-card border border-border/60 rounded-md p-2 shadow-lg dark:bg-black/80 dark:border-white/10 dark:backdrop-blur-sm">
          <p className="text-[11px] font-medium text-foreground">{item.name}</p>
          <p className="text-xs font-semibold dark:text-[#4ade80] text-primary">
            {item.quantity} vendidos
          </p>
          <p className="text-[10px] text-muted-foreground">
            R$ {item.revenue.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  const truncateName = (name: string) => {
    return name.length > 12 ? name.substring(0, 12) + "…" : name;
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
      >
        <XAxis 
          type="number" 
          tick={{ fontSize: 9, fill: isDark ? "rgba(255,255,255,0.5)" : "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickFormatter={truncateName}
          tick={{ fontSize: 10, fill: isDark ? "rgba(255,255,255,0.7)" : "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="quantity" radius={[0, 3, 3, 0]}>
          {data.map((_, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]}
              style={isDark ? { filter: `drop-shadow(0 0 3px ${COLORS[index % COLORS.length]})` } : undefined}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
