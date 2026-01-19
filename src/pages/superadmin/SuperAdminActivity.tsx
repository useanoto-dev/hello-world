import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, ShoppingCart, User, Store, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SuperAdminActivity() {
  // Recent orders
  const { data: recentOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["superadmin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          customer_name,
          total,
          status,
          created_at,
          store_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch store names
      const ordersWithStores = await Promise.all(
        (data || []).map(async (order) => {
          const { data: store } = await supabase
            .from("stores")
            .select("name")
            .eq("id", order.store_id)
            .maybeSingle();
          
          return {
            ...order,
            store_name: store?.name || "—",
          };
        })
      );

      return ordersWithStores;
    },
  });

  // Recent signups
  const { data: recentSignups, isLoading: loadingSignups } = useQuery({
    queryKey: ["superadmin-recent-signups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "confirmed":
        return "bg-blue-100 text-blue-700";
      case "preparing":
        return "bg-purple-100 text-purple-700";
      case "ready":
        return "bg-green-100 text-green-700";
      case "delivered":
        return "bg-emerald-100 text-emerald-700";
      case "canceled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "confirmed":
        return "Confirmado";
      case "preparing":
        return "Preparando";
      case "ready":
        return "Pronto";
      case "delivered":
        return "Entregue";
      case "canceled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Atividade do Sistema
        </h1>
        <p className="text-gray-500 mt-1">
          Monitore atividades recentes em tempo real
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOrders ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          #{order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]">
                              {order.customer_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(order.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600 truncate max-w-[100px] block">
                            {order.store_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {order.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getStatusColor(order.status)} text-xs`}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">Cadastros Recentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingSignups ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                recentSignups?.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {user.full_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
