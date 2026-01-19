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
import { ShoppingCart, User, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
        return "bg-primary/20 text-primary";
      case "confirmed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "preparing":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "ready":
        return "bg-success/20 text-success";
      case "delivered":
        return "bg-success/20 text-success";
      case "canceled":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
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
      <div className="admin-page-header">
        <h1 className="admin-page-title text-2xl">
          Atividade do Sistema
        </h1>
        <p className="admin-page-description">
          Monitore atividades recentes em tempo real
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-lg text-foreground">Pedidos Recentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="admin-table-header">#</TableHead>
                    <TableHead className="admin-table-header">Cliente</TableHead>
                    <TableHead className="admin-table-header">Loja</TableHead>
                    <TableHead className="admin-table-header text-right">Total</TableHead>
                    <TableHead className="admin-table-header">Status</TableHead>
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
                        <TableCell className="admin-table-cell font-mono text-xs text-foreground">
                          #{order.order_number}
                        </TableCell>
                        <TableCell className="admin-table-cell">
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px] text-foreground">
                              {order.customer_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(order.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="admin-table-cell">
                          <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
                            {order.store_name}
                          </span>
                        </TableCell>
                        <TableCell className="admin-table-cell text-right font-medium text-foreground">
                          R$ {order.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="admin-table-cell">
                          <Badge
                            className={cn("text-xs", getStatusColor(order.status))}
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
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-lg text-foreground">Cadastros Recentes</CardTitle>
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
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {user.full_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
