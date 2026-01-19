import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, ShoppingCart, DollarSign, TrendingUp, Activity } from "lucide-react";

export default function SuperAdminDashboard() {
  // Fetch stores count
  const { data: storesData } = useQuery({
    queryKey: ["superadmin-stores-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("stores")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch users count
  const { data: usersData } = useQuery({
    queryKey: ["superadmin-users-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch orders count
  const { data: ordersData } = useQuery({
    queryKey: ["superadmin-orders-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch total revenue
  const { data: revenueData } = useQuery({
    queryKey: ["superadmin-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("total")
        .neq("status", "canceled");
      return data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    },
  });

  // Fetch recent stores
  const { data: recentStores } = useQuery({
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

  // Fetch active stores (with orders in last 30 days)
  const { data: activeStoresCount } = useQuery({
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

  const stats = [
    {
      title: "Total de Lojas",
      value: storesData || 0,
      icon: Store,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Lojas Ativas (30d)",
      value: activeStoresCount || 0,
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total de Usuários",
      value: usersData || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Total de Pedidos",
      value: ordersData || 0,
      icon: ShoppingCart,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Receita Total",
      value: `R$ ${(revenueData || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Taxa de Conversão",
      value: storesData && activeStoresCount 
        ? `${((activeStoresCount / storesData) * 100).toFixed(1)}%`
        : "0%",
      icon: TrendingUp,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Super Admin
        </h1>
        <p className="text-gray-500 mt-1">
          Visão geral de todas as contas e métricas do sistema
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn(stat.bgColor, "w-12 h-12 rounded-xl flex items-center justify-center")}>
                    <Icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Stores */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Lojas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentStores?.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium">{store.name}</p>
                  <p className="text-sm text-gray-500">{store.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      store.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {store.is_active ? "Ativa" : "Inativa"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(store.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
