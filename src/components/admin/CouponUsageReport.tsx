import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  TicketPercent, TrendingUp, Users, DollarSign, Calendar as CalendarIcon, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import CouponsChart from "./charts/CouponsChart";

type PeriodFilter = "week" | "month" | "custom" | "all";

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalUses: number;
  uniqueCustomers: number;
  topCoupons: {
    code: string;
    uses_count: number;
    discount_type: string;
    discount_value: number;
  }[];
  recentUsages: {
    coupon_code: string;
    customer_phone: string;
    used_at: string;
  }[];
}

interface CouponUsageReportProps {
  storeId: string;
}

export default function CouponUsageReport({ storeId }: CouponUsageReportProps) {
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case "week":
        return { from: startOfWeek(now, { weekStartsOn: 0 }), to: now };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "custom":
        return { from: customDateRange.from, to: customDateRange.to };
      case "all":
      default:
        return { from: undefined, to: undefined };
    }
  };

  useEffect(() => {
    loadStats();
  }, [storeId, periodFilter, customDateRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();

      // Load coupons
      const { data: coupons, error: couponsError } = await supabase
        .from("coupons")
        .select("*")
        .eq("store_id", storeId);
      
      if (couponsError) throw couponsError;

      // Load usages with coupon info
      let usagesQuery = supabase
        .from("coupon_usages")
        .select(`
          id,
          customer_phone,
          used_at,
          coupon_id,
          coupons!inner (
            code
          )
        `)
        .eq("store_id", storeId)
        .order("used_at", { ascending: false });

      if (dateRange.from) {
        usagesQuery = usagesQuery.gte("used_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        usagesQuery = usagesQuery.lte("used_at", dateRange.to.toISOString());
      }

      const { data: usages, error: usagesError } = await usagesQuery.limit(50);

      if (usagesError) throw usagesError;

      // Calculate stats
      const totalCoupons = coupons?.length || 0;
      const activeCoupons = coupons?.filter(c => c.is_active).length || 0;
      
      // Get unique customers from filtered usages
      const uniquePhones = new Set(usages?.map(u => u.customer_phone) || []);
      
      // Count usages per coupon in the period
      const usageCountByCoupon: Record<string, number> = {};
      (usages || []).forEach(u => {
        usageCountByCoupon[u.coupon_id] = (usageCountByCoupon[u.coupon_id] || 0) + 1;
      });

      // Top coupons by usage in the period
      const topCoupons = (coupons || [])
        .map(c => ({
          code: c.code,
          uses_count: usageCountByCoupon[c.id] || 0,
          discount_type: c.discount_type || "percentage",
          discount_value: c.discount_value
        }))
        .filter(c => c.uses_count > 0)
        .sort((a, b) => b.uses_count - a.uses_count)
        .slice(0, 5);

      // Format recent usages
      const recentUsages = (usages || []).slice(0, 10).map(u => ({
        coupon_code: (u.coupons as any)?.code || "N/A",
        customer_phone: u.customer_phone,
        used_at: u.used_at
      }));

      setStats({
        totalCoupons,
        activeCoupons,
        totalUses: usages?.length || 0,
        uniqueCustomers: uniquePhones.size,
        topCoupons,
        recentUsages
      });
    } catch (error) {
      console.error("Error loading coupon stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getPeriodLabel = () => {
    const dateRange = getDateRange();
    if (periodFilter === "all") return "Todo período";
    if (periodFilter === "week") return "Esta semana";
    if (periodFilter === "month") return "Este mês";
    if (periodFilter === "custom" && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`;
    }
    return "Período personalizado";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-2">Período:</span>
        
        <Button
          variant={periodFilter === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter("week")}
        >
          Semana
        </Button>
        
        <Button
          variant={periodFilter === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter("month")}
        >
          Mês
        </Button>
        
        <Button
          variant={periodFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter("all")}
        >
          Tudo
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={periodFilter === "custom" ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              {periodFilter === "custom" && customDateRange.from && customDateRange.to
                ? `${format(customDateRange.from, "dd/MM", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM", { locale: ptBR })}`
                : "Personalizado"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: customDateRange.from, to: customDateRange.to }}
              onSelect={(range) => {
                setCustomDateRange({ from: range?.from, to: range?.to });
                if (range?.from && range?.to) {
                  setPeriodFilter("custom");
                }
              }}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Badge variant="secondary" className="ml-auto">
          {getPeriodLabel()}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TicketPercent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCoupons}</p>
                <p className="text-xs text-muted-foreground">Total de Cupons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeCoupons}</p>
                <p className="text-xs text-muted-foreground">Cupons Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUses}</p>
                <p className="text-xs text-muted-foreground">Usos no Período</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueCustomers}</p>
                <p className="text-xs text-muted-foreground">Clientes Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Coupons Chart */}
      {stats.topCoupons.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Cupons Mais Usados no Período</CardTitle>
          </CardHeader>
          <CardContent>
            <CouponsChart data={stats.topCoupons} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              Nenhum uso de cupom registrado neste período
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Usages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Últimos Usos no Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentUsages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum uso de cupom registrado neste período
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentUsages.map((usage, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {usage.coupon_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPhone(usage.customer_phone)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(usage.used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
