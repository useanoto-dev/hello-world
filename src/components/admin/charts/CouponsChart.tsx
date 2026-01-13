import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useTheme } from "@/hooks/useTheme";

interface CouponData {
  code: string;
  uses_count: number;
  discount_type: string;
  discount_value: number;
}

interface CouponsChartProps {
  data: CouponData[];
}

const COLORS_LIGHT = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
const COLORS_DARK = ["#fb7185", "#fb923c", "#fbbf24", "#4ade80", "#60a5fa"];

export default function CouponsChart({ data }: CouponsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const coupon = payload[0].payload;
      const discountLabel = coupon.discount_type === "percentage" 
        ? `${coupon.discount_value}%` 
        : `R$ ${coupon.discount_value.toFixed(2)}`;
      
      return (
        <div className="bg-card border border-border/60 rounded-md p-2 shadow-lg dark:bg-black/80 dark:border-white/10 dark:backdrop-blur-sm">
          <p className="text-[11px] font-semibold text-foreground">{coupon.code}</p>
          <p className="text-[10px] text-muted-foreground">Desconto: {discountLabel}</p>
          <p className="text-[10px] font-medium dark:text-[#4ade80] text-primary">{coupon.uses_count} usos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 5, right: 5 }}>
        <XAxis type="number" hide />
        <YAxis 
          type="category" 
          dataKey="code" 
          width={60}
          tick={{ fontSize: 10, fill: isDark ? "rgba(255,255,255,0.7)" : "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "hsl(var(--muted) / 0.3)" }} />
        <Bar dataKey="uses_count" radius={[0, 3, 3, 0]}>
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
