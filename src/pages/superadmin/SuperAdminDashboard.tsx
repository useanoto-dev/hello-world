import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, ShoppingCart, DollarSign, TrendingUp, Activity, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionData {
  store_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  plan: string | null;
  stores: { name: string; slug: string } | null;
}

export default function SuperAdminDashboard() {
  // Fetch stores count
  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ["superadmin-stores-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("stores")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch users count
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["superadmin-users-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch orders count
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["superadmin-orders-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch total revenue
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["superadmin-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("total")
        .neq("status", "canceled");
      return data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    },
  });

  // Fetch subscription metrics for conversion analysis
  const { data: subscriptionMetrics, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["superadmin-subscription-metrics"],
    queryFn: async () => {
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("store_id, status, trial_ends_at, current_period_end, created_at, plan, stores(name, slug)");
      
      if (!subscriptions) return {
        totalTrials: 0,
        activeSubscriptions: 0,
        expiredTrials: 0,
        conversionRate: 0,
        avgConversionDays: 0,
        expiringIn3Days: [] as SubscriptionData[],
        recentConversions: [] as SubscriptionData[]
      };

      const now = new Date();
      const totalTrials = subscriptions.filter(s => s.status === 'trial').length;
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      const expiredTrials = subscriptions.filter(s => {
        if (s.status !== 'trial' || !s.trial_ends_at) return false;
        return new Date(s.trial_ends_at) < now;
      }).length;

      // Conversion rate: active / (active + expired trials)
      const totalEvaluated = activeSubscriptions + expiredTrials;
      const conversionRate = totalEvaluated > 0 ? (activeSubscriptions / totalEvaluated) * 100 : 0;

      // Average days to convert (from created_at to current_period_end for active subscriptions)
      const conversions = subscriptions.filter(s => s.status === 'active' && s.current_period_end);
      const avgConversionDays = conversions.length > 0
        ? conversions.reduce((sum, s) => {
            const created = new Date(s.created_at);
            const converted = new Date(s.current_period_end!);
            return sum + Math.max(0, differenceInDays(converted, created) - 30); // Subtract billing cycle
          }, 0) / conversions.length
        : 0;

      // Trials expiring in next 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const expiringIn3Days = subscriptions.filter(s => {
        if (s.status !== 'trial' || !s.trial_ends_at) return false;
        const trialEnd = new Date(s.trial_ends_at);
        return trialEnd > now && trialEnd <= threeDaysFromNow;
      }) as SubscriptionData[];

      // Recent conversions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentConversions = subscriptions.filter(s => {
        if (s.status !== 'active' || !s.current_period_end) return false;
        return new Date(s.current_period_end) > thirtyDaysAgo;
      }).slice(0, 5) as SubscriptionData[];

      return {
        totalTrials,
        activeSubscriptions,
        expiredTrials,
        conversionRate,
        avgConversionDays,
        expiringIn3Days,
        recentConversions
      };
    },
  });

  // Fetch active stores (with orders in last 30 days)
  const { data: activeStoresCount, isLoading: activeLoading } = useQuery({
    queryKey: ["superadmin-active-stores"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data } = await supabase
        .from("orders")
        .select("store_id")
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      const uniqueStores = new Set(data?.map(o => o.store_id));
      return uniqueStores.size;
    },
  });

  // Fetch recent stores
  const { data: recentStores, isLoading: recentLoading } = useQuery({
    queryKey: ["superadmin-recent-stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, slug, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const isLoading = storesLoading || usersLoading || ordersLoading || revenueLoading || subscriptionsLoading || activeLoading;

  const stats = [
    {
      title: "Total de Lojas",
      value: storesData || 0,
      icon: Store,
      gradient: "from-primary to-primary/80",
    },
    {
      title: "Lojas Ativas (30d)",
      value: activeStoresCount || 0,
      icon: Activity,
      gradient: "from-success to-success/80",
    },
    {
      title: "Total de Usuários",
      value: usersData || 0,
      icon: Users,
      gradient: "from-primary to-primary/80",
    },
    {
      title: "Total de Pedidos",
      value: ordersData || 0,
      icon: ShoppingCart,
      gradient: "from-primary to-primary/80",
    },
    {
      title: "Receita Total",
      value: `R$ ${(revenueData || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      gradient: "from-success to-success/80",
    },
    {
      title: "Taxa de Conversão",
      value: `${(subscriptionMetrics?.conversionRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      gradient: "from-primary to-primary/80",
      subtitle: "Trial → Pago"
    },
  ];

  const conversionStats = [
    {
      title: "Trials Ativos",
      value: subscriptionMetrics?.totalTrials || 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      title: "Assinaturas Ativas",
      value: subscriptionMetrics?.activeSubscriptions || 0,
      icon: CheckCircle,
      color: "text-success bg-success/10",
    },
    {
      title: "Trials Expirados",
      value: subscriptionMetrics?.expiredTrials || 0,
      icon: AlertTriangle,
      color: "text-destructive bg-destructive/10",
    },
    {
      title: "Tempo Médio Conversão",
      value: `${Math.round(subscriptionMetrics?.avgConversionDays || 0)} dias`,
      icon: TrendingUp,
      color: "text-primary bg-primary/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="admin-page-header">
        <h1 className="admin-page-title text-2xl">
          Dashboard Super Admin
        </h1>
        <p className="admin-page-description">
          Visão geral de todas as contas e métricas do sistema
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="admin-card overflow-hidden">
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="w-12 h-12 rounded-xl" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1 text-foreground">{stat.value}</p>
                      {stat.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                      )}
                    </div>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", stat.gradient)}>
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Conversion Metrics */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Métricas de Conversão Trial → Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {conversionStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Trials Expiring Soon Alert */}
      {subscriptionMetrics?.expiringIn3Days && subscriptionMetrics.expiringIn3Days.length > 0 && (
        <Card className="admin-card border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Trials Expirando em 3 Dias ({subscriptionMetrics.expiringIn3Days.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscriptionMetrics.expiringIn3Days.map((sub) => (
                <div
                  key={sub.store_id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div>
                    <p className="font-medium text-foreground">{sub.stores?.name || "Loja"}</p>
                    <p className="text-sm text-muted-foreground">{sub.stores?.slug}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Expira em {sub.trial_ends_at && differenceInDays(new Date(sub.trial_ends_at), new Date())} dias
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.trial_ends_at && format(new Date(sub.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Conversions */}
      {subscriptionMetrics?.recentConversions && subscriptionMetrics.recentConversions.length > 0 && (
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Conversões Recentes (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscriptionMetrics.recentConversions.map((sub) => (
                <div
                  key={sub.store_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{sub.stores?.name || "Loja"}</p>
                    <p className="text-sm text-muted-foreground">{sub.stores?.slug}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                      {sub.plan === 'annual' ? 'Anual' : 'Mensal'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Stores */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Lojas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentStores?.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{store.name}</p>
                    <p className="text-sm text-muted-foreground">{store.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        store.is_active
                          ? "bg-success/20 text-success"
                          : "bg-destructive/20 text-destructive"
                      )}
                    >
                      {store.is_active ? "Ativa" : "Inativa"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(store.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
