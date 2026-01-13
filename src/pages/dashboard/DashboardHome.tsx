// Dashboard Home - Anotô SaaS - Professional Design
import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ShoppingBag, Package, DollarSign, TrendingUp, 
  ExternalLink, Copy, TicketPercent,
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight,
  ChefHat, UtensilsCrossed, CreditCard, CalendarRange
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import CouponsChart from "@/components/admin/charts/CouponsChart";
import SalesPeriodChart from "@/components/admin/charts/SalesPeriodChart";
import TopProductsChart from "@/components/admin/charts/TopProductsChart";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  pendingOrders: number;
  yesterdayOrders: number;
  yesterdayRevenue: number;
}

interface CouponStats {
  code: string;
  uses_count: number;
  discount_type: string;
  discount_value: number;
}

interface RecentOrder {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

interface ProductStats {
  name: string;
  quantity: number;
  revenue: number;
}

type PeriodType = "week" | "month" | "custom";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function DashboardHome() {
  const { store, subscription } = useOutletContext<{ 
    store: any; 
    subscription: any; 
  }>();
  
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    totalProducts: 0,
    pendingOrders: 0,
    yesterdayOrders: 0,
    yesterdayRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topCoupons, setTopCoupons] = useState<CouponStats[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("week");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [tempDateRange, setTempDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (store?.id) {
      loadDashboardData();
      
      // Subscribe to real-time order updates
      const channel = supabase
        .channel("dashboard-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `store_id=eq.${store.id}`
          },
          () => {
            // Reload dashboard data when any order changes
            loadDashboardData();
            loadSalesData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [store?.id]);

  useEffect(() => {
    if (store?.id) {
      if (selectedPeriod === "custom" && customDateRange.from && customDateRange.to) {
        loadSalesData();
      } else if (selectedPeriod !== "custom") {
        loadSalesData();
      }
    }
  }, [store?.id, selectedPeriod, customDateRange]);

  const loadDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Pedidos de hoje
      const { data: todayOrdersData, count: todayOrdersCount } = await supabase
        .from("orders")
        .select("total", { count: "exact" })
        .eq("store_id", store.id)
        .gte("created_at", today.toISOString());

      // Pedidos de ontem (para comparação)
      const { data: yesterdayOrdersData, count: yesterdayOrdersCount } = await supabase
        .from("orders")
        .select("total", { count: "exact" })
        .eq("store_id", store.id)
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

      // Total de produtos
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id);

      // Pedidos pendentes
      const { count: pendingCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id)
        .in("status", ["pending", "confirmed", "preparing"]);

      // Pedidos recentes
      const { data: recentData } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total, status, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Cupons mais usados
      const { data: couponsData } = await supabase
        .from("coupons")
        .select("code, uses_count, discount_type, discount_value")
        .eq("store_id", store.id)
        .gt("uses_count", 0)
        .order("uses_count", { ascending: false })
        .limit(5);

      // Produtos mais vendidos (últimos 30 dias)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: ordersWithItems } = await supabase
        .from("orders")
        .select("items, total")
        .eq("store_id", store.id)
        .neq("status", "canceled")
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Processar produtos mais vendidos
      const productCounts: Record<string, { quantity: number; revenue: number }> = {};
      ordersWithItems?.forEach((order) => {
        const items = order.items as any[];
        items?.forEach((item) => {
          const name = item.name || item.productName || "Produto";
          const qty = item.quantity || 1;
          const price = item.price || item.unitPrice || 0;
          if (!productCounts[name]) {
            productCounts[name] = { quantity: 0, revenue: 0 };
          }
          productCounts[name].quantity += qty;
          productCounts[name].revenue += price * qty;
        });
      });

      const topProductsList = Object.entries(productCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const todayRevenue = todayOrdersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const yesterdayRevenue = yesterdayOrdersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      setStats({
        todayOrders: todayOrdersCount || 0,
        todayRevenue,
        totalProducts: productsCount || 0,
        pendingOrders: pendingCount || 0,
        yesterdayOrders: yesterdayOrdersCount || 0,
        yesterdayRevenue
      });

      setRecentOrders(recentData || []);
      setTopCoupons(couponsData || []);
      setTopProducts(topProductsList);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesData = async () => {
    try {
      let startDate: Date;
      let endDate: Date = new Date();
      
      switch (selectedPeriod) {
        case "week":
          startDate = subDays(new Date(), 7);
          break;
        case "month":
          startDate = subMonths(new Date(), 1);
          break;
        case "custom":
          if (!customDateRange.from || !customDateRange.to) return;
          startDate = customDateRange.from;
          endDate = customDateRange.to;
          break;
        default:
          startDate = subDays(new Date(), 7);
      }

      const { data: ordersData } = await supabase
        .from("orders")
        .select("total, created_at")
        .eq("store_id", store.id)
        .neq("status", "canceled")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      const dailyData: Record<string, { revenue: number; orders: number }> = {};
      
      let currentDate = new Date(startDate);
      const finalDate = selectedPeriod === "custom" ? endDate : new Date();
      while (currentDate <= finalDate) {
        const dateKey = format(currentDate, "yyyy-MM-dd");
        dailyData[dateKey] = { revenue: 0, orders: 0 };
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }

      ordersData?.forEach((order) => {
        const dateKey = format(new Date(order.created_at), "yyyy-MM-dd");
        if (dailyData[dateKey]) {
          dailyData[dateKey].revenue += order.total || 0;
          dailyData[dateKey].orders += 1;
        }
      });

      const salesDataList = Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSalesData(salesDataList);
    } catch (error) {
      console.error("Error loading sales data:", error);
    }
  };

  const copyStoreLink = () => {
    const url = `${window.location.origin}/cardapio/${store?.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      confirmed: "Confirmado",
      preparing: "Preparando",
      ready: "Pronto",
      delivering: "Em entrega",
      completed: "Concluído",
      canceled: "Cancelado"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      preparing: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      ready: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      delivering: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      completed: "bg-muted text-muted-foreground",
      canceled: "bg-destructive/10 text-destructive"
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const trialDaysLeft = subscription?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const periodTotals = salesData.reduce(
    (acc, day) => ({
      revenue: acc.revenue + day.revenue,
      orders: acc.orders + day.orders
    }),
    { revenue: 0, orders: 0 }
  );

  // Calcular variação percentual
  const getVariation = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const ordersVariation = getVariation(stats.todayOrders, stats.yesterdayOrders);
  const revenueVariation = getVariation(stats.todayRevenue, stats.yesterdayRevenue);

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        
        <div className="flex items-center gap-1.5">
          {subscription?.status === "trial" && trialDaysLeft > 0 && (
            <div className="px-2 py-1 bg-amber-200 rounded-md">
              <span className="text-[10px] text-black font-medium">
                {trialDaysLeft}d trial
              </span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={copyStoreLink} className="h-7 text-[10px] px-2 bg-[#fafafa] dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 hover:bg-[#fafafa] dark:hover:bg-neutral-700">
            <Copy className="w-3 h-3 mr-1" />
            Copiar link
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-[10px] px-2 bg-[#fafafa] dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 hover:bg-[#fafafa] dark:hover:bg-neutral-700">
            <a href={`/cardapio/${store?.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              Ver cardápio
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-[#fafafa] border border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.15]">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pedidos hoje</p>
                  <p className="text-lg font-semibold mt-0.5 dark:text-[#4ade80] dark:drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]">{stats.todayOrders}</p>
                </div>
                {ordersVariation > 0 && (
                  <div className="flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded text-emerald-600 bg-emerald-500/10 dark:text-[#4ade80] dark:bg-[#4ade80]/10">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    {ordersVariation}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <Card className="bg-[#fafafa] border border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.15]">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Faturamento</p>
                  <p className="text-lg font-semibold mt-0.5 dark:text-[#4ade80] dark:drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]">
                    R$ {stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                {revenueVariation > 0 && (
                  <div className="flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded text-emerald-600 bg-emerald-500/10 dark:text-[#4ade80] dark:bg-[#4ade80]/10">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    {revenueVariation}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <Card className="bg-[#fafafa] border border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.15]">
            <CardContent className="p-3">
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Produtos</p>
                <p className="text-lg font-semibold mt-0.5 dark:text-white">{stats.totalProducts}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
        >
          <Card className={cn(
            "bg-[#fafafa] border border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.15]",
            stats.pendingOrders > 0 && "border-amber-500 bg-amber-500/5 dark:border-amber-500/30"
          )}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pendentes</p>
                  <p className="text-lg font-semibold mt-0.5 dark:text-white">{stats.pendingOrders}</p>
                </div>
                {stats.pendingOrders > 0 && (
                  <Button asChild size="sm" variant="ghost" className="h-5 text-[9px] px-1.5">
                    <Link to="/dashboard/orders">Ver</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>


      {/* Sales Chart */}
      <Card className="border-border/40 dark:bg-white/[0.03] dark:border-white/[0.06]">
        <CardHeader className="pb-1 pt-3 px-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-medium dark:text-white">Vendas</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                R$ {periodTotals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {periodTotals.orders} pedidos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodType)}>
                <TabsList className="h-6 bg-[#fafafa] border border-gray-300">
                  <TabsTrigger value="week" className="text-[10px] px-2 h-5 text-black data-[state=active]:bg-white data-[state=active]:text-black">7 dias</TabsTrigger>
                  <TabsTrigger value="month" className="text-[10px] px-2 h-5 text-black data-[state=active]:bg-white data-[state=active]:text-black">30 dias</TabsTrigger>
                  <TabsTrigger value="custom" className="text-[10px] px-2 h-5 text-black data-[state=active]:bg-white data-[state=active]:text-black">Período</TabsTrigger>
                </TabsList>
              </Tabs>
              {selectedPeriod === "custom" && (
                <Popover open={datePickerOpen} onOpenChange={(open) => {
                  setDatePickerOpen(open);
                  if (open) {
                    setTempDateRange(customDateRange);
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                      <CalendarRange className="w-3 h-3" />
                      {customDateRange.from && customDateRange.to ? (
                        <span>
                          {format(customDateRange.from, "dd/MM")} - {format(customDateRange.to, "dd/MM")}
                        </span>
                      ) : (
                        <span>Selecionar</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#f1f2f3]" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={tempDateRange.from || tempDateRange.to ? { from: tempDateRange.from, to: tempDateRange.to } : undefined}
                      onSelect={(range) => {
                        if (!range) {
                          setTempDateRange({ from: undefined, to: undefined });
                        } else {
                          setTempDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      numberOfMonths={2}
                      className="p-3 pointer-events-auto"
                      classNames={{
                        months: "flex flex-col sm:flex-row gap-4",
                        month: "space-y-4",
                        day_today: "bg-transparent text-foreground font-medium",
                      }}
                    />
                    <div className="p-3 border-t border-border/40 flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-muted-foreground"
                        onClick={() => {
                          setTempDateRange({ from: undefined, to: undefined });
                        }}
                      >
                        Limpar
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            setTempDateRange({ from: undefined, to: undefined });
                            setDatePickerOpen(false);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={!tempDateRange.from || !tempDateRange.to}
                          onClick={() => {
                            setCustomDateRange(tempDateRange);
                            setDatePickerOpen(false);
                          }}
                        >
                          Filtrar
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-2 pb-2">
          {salesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
              <p className="text-[11px]">Nenhuma venda no período</p>
            </div>
          ) : (
            <SalesPeriodChart data={salesData} />
          )}
        </CardContent>
      </Card>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 bg-[#fafafa] border border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.15]">
          <CardHeader className="pb-1 pt-3 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium dark:text-white">Últimos Pedidos</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-5 text-[10px] px-1.5">
                <Link to="/dashboard/orders">Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3">
            {recentOrders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ShoppingBag className="w-6 h-6 mx-auto mb-1 opacity-30" />
                <p className="text-[11px]">Nenhum pedido</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center flex-shrink-0">
                        <span className="text-black font-semibold text-[10px]">
                          #{order.order_number}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[11px] truncate dark:text-white">{order.customer_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-[11px] dark:text-white">R$ {order.total.toFixed(0)}</p>
                      <span className={cn("text-[9px] px-1 py-0.5 rounded font-medium", getStatusColor(order.status))}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-[#fafafa] border border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.15]">
          <CardHeader className="pb-1 pt-3 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5 dark:text-white">
                <BarChart3 className="w-3.5 h-3.5" />
                Mais Vendidos
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-5 text-[10px] px-1.5">
                <Link to="/dashboard/products">Ver</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-1 pb-1">
            {topProducts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="w-6 h-6 mx-auto mb-1 opacity-30" />
                <p className="text-[11px]">Sem dados</p>
              </div>
            ) : (
              <TopProductsChart data={topProducts} />
            )}
          </CardContent>
        </Card>

        {/* Coupons - Compact */}
        <Card className="bg-[#fafafa] border border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.15]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TicketPercent className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cupons ativos</p>
                  <p className="text-lg font-semibold dark:text-white">{topCoupons.length}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-[10px] px-3 bg-[#fafafa] border-gray-300">
                <Link to="/dashboard/coupons">Gerenciar cupons</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
