import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Clock, DollarSign, Users, ShoppingBag, Calendar, ArrowUpRight, ArrowDownRight, Minus, Package } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachHourOfInterval, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/hooks/useTheme";
import { CriticalStockReport } from "@/components/admin/charts/CriticalStockReport";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";

type PeriodType = "7d" | "14d" | "30d" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth";

interface Order {
  id: string;
  total: number;
  created_at: string;
  status: string;
  order_type: string;
  items: any[];
}

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [period, setPeriod] = useState<PeriodType>("7d");
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (period) {
      case "7d":
        start = subDays(now, 7);
        end = now;
        break;
      case "14d":
        start = subDays(now, 14);
        end = now;
        break;
      case "30d":
        start = subDays(now, 30);
        end = now;
        break;
      case "thisWeek":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "lastWeek":
        start = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        end = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        break;
      case "thisMonth":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(now), 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        start = subDays(now, 7);
        end = now;
    }
    
    return { start: startOfDay(start), end: endOfDay(end) };
  }, [period]);

  // Fetch orders for the period
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["analytics-orders", profile?.store_id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!profile?.store_id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", profile.store_id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .neq("status", "cancelled")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!profile?.store_id,
  });

  // Fetch comparison period orders
  const comparisonRange = useMemo(() => {
    const days = differenceInDays(dateRange.end, dateRange.start);
    return {
      start: startOfDay(subDays(dateRange.start, days + 1)),
      end: endOfDay(subDays(dateRange.start, 1)),
    };
  }, [dateRange]);

  const { data: comparisonOrders = [] } = useQuery({
    queryKey: ["analytics-comparison", profile?.store_id, comparisonRange.start, comparisonRange.end],
    queryFn: async () => {
      if (!profile?.store_id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", profile.store_id)
        .gte("created_at", comparisonRange.start.toISOString())
        .lte("created_at", comparisonRange.end.toISOString())
        .neq("status", "cancelled");

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!profile?.store_id,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const uniqueCustomers = new Set(orders.map(o => (o as any).customer_phone)).size;

    // Comparison metrics
    const prevRevenue = comparisonOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevOrders = comparisonOrders.length;
    const prevAvgTicket = prevOrders > 0 ? prevRevenue / prevOrders : 0;
    const prevCustomers = new Set(comparisonOrders.map(o => (o as any).customer_phone)).size;

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersChange = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;
    const ticketChange = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0;
    const customersChange = prevCustomers > 0 ? ((uniqueCustomers - prevCustomers) / prevCustomers) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      avgTicket,
      uniqueCustomers,
      revenueChange,
      ordersChange,
      ticketChange,
      customersChange,
    };
  }, [orders, comparisonOrders]);

  // Daily trend data
  const dailyTrend = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= startOfDay(day) && orderDate <= endOfDay(day);
      });
      
      const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const count = dayOrders.length;
      const avgTicket = count > 0 ? revenue / count : 0;

      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
        revenue,
        orders: count,
        avgTicket,
      };
    });
  }, [orders, dateRange]);

  // Hourly distribution (peak hours)
  const hourlyData = useMemo(() => {
    const hourCounts: Record<number, { orders: number; revenue: number }> = {};
    
    for (let h = 0; h < 24; h++) {
      hourCounts[h] = { orders: 0, revenue: 0 };
    }
    
    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourCounts[hour].orders += 1;
      hourCounts[hour].revenue += order.total || 0;
    });

    return Object.entries(hourCounts).map(([hour, data]) => ({
      hour: `${hour.padStart(2, "0")}h`,
      hourNum: parseInt(hour),
      orders: data.orders,
      revenue: data.revenue,
    }));
  }, [orders]);

  // Find peak hours
  const peakHours = useMemo(() => {
    const sorted = [...hourlyData].sort((a, b) => b.orders - a.orders);
    return sorted.slice(0, 3);
  }, [hourlyData]);

  // Order type distribution
  const orderTypes = useMemo(() => {
    const types: Record<string, number> = {};
    orders.forEach(order => {
      const type = order.order_type || "unknown";
      types[type] = (types[type] || 0) + 1;
    });

    const labels: Record<string, string> = {
      delivery: "Delivery",
      pickup: "Retirada",
      dine_in: "Mesa",
      unknown: "Outros",
    };

    return Object.entries(types).map(([type, count]) => ({
      type: labels[type] || type,
      count,
      percentage: orders.length > 0 ? (count / orders.length) * 100 : 0,
    }));
  }, [orders]);

  // Chart colors
  const chartColors = {
    primary: isDark ? "#22c55e" : "hsl(var(--primary))",
    secondary: isDark ? "#10b981" : "hsl(var(--secondary))",
    accent: isDark ? "#34d399" : "hsl(var(--accent))",
    muted: isDark ? "#6b7280" : "hsl(var(--muted-foreground))",
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <span className="flex items-center gap-0.5 text-success text-[9px]">
          <ArrowUpRight className="w-3 h-3" />
          +{value.toFixed(1)}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center gap-0.5 text-destructive text-[9px]">
          <ArrowDownRight className="w-3 h-3" />
          {value.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground text-[9px]">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold dark:text-white">Analytics</h1>
          <p className="text-[11px] text-muted-foreground">Métricas detalhadas do seu negócio</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
          <SelectTrigger className="w-[140px] h-7 text-[10px]">
            <Calendar className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d" className="text-[10px]">Últimos 7 dias</SelectItem>
            <SelectItem value="14d" className="text-[10px]">Últimos 14 dias</SelectItem>
            <SelectItem value="30d" className="text-[10px]">Últimos 30 dias</SelectItem>
            <SelectItem value="thisWeek" className="text-[10px]">Esta semana</SelectItem>
            <SelectItem value="lastWeek" className="text-[10px]">Semana passada</SelectItem>
            <SelectItem value="thisMonth" className="text-[10px]">Este mês</SelectItem>
            <SelectItem value="lastMonth" className="text-[10px]">Mês passado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-md bg-primary/10">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
              </div>
              <ChangeIndicator value={metrics.revenueChange} />
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-muted-foreground">Faturamento</p>
              <p className="text-lg font-bold dark:text-neon-green">{formatCurrency(metrics.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-md bg-secondary/10">
                <ShoppingBag className="w-3.5 h-3.5 text-secondary" />
              </div>
              <ChangeIndicator value={metrics.ordersChange} />
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-muted-foreground">Pedidos</p>
              <p className="text-lg font-bold dark:text-neon-green">{metrics.totalOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-md bg-accent/10">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
              </div>
              <ChangeIndicator value={metrics.ticketChange} />
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-muted-foreground">Ticket Médio</p>
              <p className="text-lg font-bold dark:text-neon-green">{formatCurrency(metrics.avgTicket)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <ChangeIndicator value={metrics.customersChange} />
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-muted-foreground">Clientes Únicos</p>
              <p className="text-lg font-bold dark:text-neon-green">{metrics.uniqueCustomers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-8 bg-muted/50">
          <TabsTrigger value="overview" className="text-[10px] h-7">
            <TrendingUp className="w-3 h-3 mr-1" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="peak" className="text-[10px] h-7">
            <Clock className="w-3 h-3 mr-1" />
            Horários
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-[10px] h-7">
            <Package className="w-3 h-3 mr-1" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="details" className="text-[10px] h-7">
            <ShoppingBag className="w-3 h-3 mr-1" />
            Detalhes
          </TabsTrigger>
        </TabsList>

        {/* TAB: Tendências */}
        <TabsContent value="overview" className="mt-3 space-y-3">
          {/* Revenue Trend */}
          <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Faturamento Diário</CardTitle>
              <CardDescription className="text-[9px]">Evolução do faturamento no período</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1f1f1f" : "#fff",
                        border: isDark ? "1px solid #333" : "1px solid #eee",
                        borderRadius: 8,
                        fontSize: 10,
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={chartColors.primary}
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Orders & Ticket Trend */}
          <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Pedidos & Ticket Médio</CardTitle>
              <CardDescription className="text-[9px]">Comparativo diário</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 9, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 9, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1f1f1f" : "#fff",
                        border: isDark ? "1px solid #333" : "1px solid #eee",
                        borderRadius: 8,
                        fontSize: 10,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar yAxisId="left" dataKey="orders" name="Pedidos" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="avgTicket" name="Ticket Médio" stroke={chartColors.primary} strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Horários de Pico */}
        <TabsContent value="peak" className="mt-3 space-y-3">
          {/* Peak Hours Summary */}
          <div className="grid grid-cols-3 gap-2">
            {peakHours.map((peak, idx) => (
              <Card key={peak.hourNum} className="dark:bg-white/[0.03] dark:border-white/[0.06]">
                <CardContent className="p-3 text-center">
                  <div className="text-[9px] text-muted-foreground mb-1">
                    {idx === 0 ? "🥇 1º Pico" : idx === 1 ? "🥈 2º Pico" : "🥉 3º Pico"}
                  </div>
                  <p className="text-lg font-bold dark:text-neon-green">{peak.hour}</p>
                  <p className="text-[9px] text-muted-foreground">{peak.orders} pedidos</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Hourly Distribution Chart */}
          <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Distribuição por Hora</CardTitle>
              <CardDescription className="text-[9px]">Volume de pedidos por horário</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData.filter(h => h.hourNum >= 8 && h.hourNum <= 23)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fontSize: 8, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1f1f1f" : "#fff",
                        border: isDark ? "1px solid #333" : "1px solid #eee",
                        borderRadius: 8,
                        fontSize: 10,
                      }}
                      formatter={(value: number, name: string) => [
                        name === "orders" ? `${value} pedidos` : formatCurrency(value),
                        name === "orders" ? "Pedidos" : "Faturamento"
                      ]}
                    />
                    <Bar 
                      dataKey="orders" 
                      fill={chartColors.primary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Hour */}
          <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Faturamento por Hora</CardTitle>
              <CardDescription className="text-[9px]">Receita gerada por horário</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData.filter(h => h.hourNum >= 8 && h.hourNum <= 23)}>
                    <defs>
                      <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fontSize: 8, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: chartColors.muted }}
                      axisLine={{ stroke: isDark ? "#333" : "#eee" }}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1f1f1f" : "#fff",
                        border: isDark ? "1px solid #333" : "1px solid #eee",
                        borderRadius: 8,
                        fontSize: 10,
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={chartColors.secondary}
                      strokeWidth={2}
                      fill="url(#hourlyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Estoque */}
        <TabsContent value="stock" className="mt-3">
          <CriticalStockReport storeId={profile?.store_id} />
        </TabsContent>

        {/* TAB: Detalhes */}
        <TabsContent value="details" className="mt-3 space-y-3">
          {/* Order Types */}
          <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Tipos de Pedido</CardTitle>
              <CardDescription className="text-[9px]">Distribuição por modalidade</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-2">
                {orderTypes.map((type) => (
                  <div key={type.type} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium">{type.type}</span>
                        <span className="text-[9px] text-muted-foreground">{type.count} ({type.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${type.percentage}%`,
                            backgroundColor: chartColors.primary
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Period Comparison */}
          <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Comparativo de Períodos</CardTitle>
              <CardDescription className="text-[9px]">Período atual vs período anterior</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[9px] text-muted-foreground mb-1">Período Atual</p>
                  <p className="text-sm font-bold dark:text-neon-green">{formatCurrency(metrics.totalRevenue)}</p>
                  <p className="text-[9px] text-muted-foreground">{metrics.totalOrders} pedidos</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[9px] text-muted-foreground mb-1">Período Anterior</p>
                  <p className="text-sm font-bold">{formatCurrency(comparisonOrders.reduce((s, o) => s + (o.total || 0), 0))}</p>
                  <p className="text-[9px] text-muted-foreground">{comparisonOrders.length} pedidos</p>
                </div>
              </div>
              
              <div className="mt-3 p-2 rounded-md bg-muted/20 text-center">
                <span className="text-[10px]">
                  {metrics.revenueChange > 0 ? "📈" : metrics.revenueChange < 0 ? "📉" : "➡️"}
                  {" "}
                  {metrics.revenueChange > 0 ? "Crescimento de " : metrics.revenueChange < 0 ? "Queda de " : "Sem variação "}
                  <span className={`font-bold ${metrics.revenueChange > 0 ? "text-success" : metrics.revenueChange < 0 ? "text-destructive" : ""}`}>
                    {Math.abs(metrics.revenueChange).toFixed(1)}%
                  </span>
                  {" no faturamento"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Daily Average */}
          <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium">Médias Diárias</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-muted-foreground">Faturamento/dia</p>
                  <p className="text-sm font-bold dark:text-neon-green">
                    {formatCurrency(metrics.totalRevenue / Math.max(dailyTrend.length, 1))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Pedidos/dia</p>
                  <p className="text-sm font-bold dark:text-neon-green">
                    {(metrics.totalOrders / Math.max(dailyTrend.length, 1)).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Ticket Médio</p>
                  <p className="text-sm font-bold dark:text-neon-green">
                    {formatCurrency(metrics.avgTicket)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
