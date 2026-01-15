import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ClipboardList, DollarSign, ShoppingBag, 
  TrendingUp, Clock, User, X
} from "lucide-react";
import { format, startOfDay, endOfDay, isToday, isThisWeek, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'canceled' | 'all';
type DateFilter = 'today' | 'week' | 'month' | 'custom';

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number | null;
  discount: number | null;
  items: any;
  created_at: string;
  table_id: string | null;
  address: any;
  notes: string | null;
  payment_method: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500" },
  confirmed: { label: "Confirmado", color: "bg-blue-500" },
  preparing: { label: "Preparando", color: "bg-orange-500" },
  ready: { label: "Pronto", color: "bg-green-500" },
  delivered: { label: "Entregue", color: "bg-emerald-600" },
  canceled: { label: "Cancelado", color: "bg-red-500" },
};

export default function WaiterOrdersPage() {
  const { staffId, name, storeId } = useStaffAuth();
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch orders created by this waiter
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['waiter-orders', staffId, storeId],
    queryFn: async () => {
      if (!staffId || !storeId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!staffId && !!storeId,
  });

  // Filter orders based on status and date
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Date filter
      const orderDate = new Date(order.created_at);
      
      switch (dateFilter) {
        case 'today':
          return isToday(orderDate);
        case 'week':
          return isThisWeek(orderDate, { weekStartsOn: 0 });
        case 'month':
          return isThisMonth(orderDate);
        case 'custom':
          if (customStartDate && customEndDate) {
            const start = startOfDay(new Date(customStartDate));
            const end = endOfDay(new Date(customEndDate));
            return orderDate >= start && orderDate <= end;
          }
          return true;
        default:
          return true;
      }
    });
  }, [orders, statusFilter, dateFilter, customStartDate, customEndDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completedOrders = filteredOrders.filter(o => 
      o.status !== 'canceled' && o.status !== 'pending'
    );
    const totalSales = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgTicket = completedOrders.length > 0 
      ? totalSales / completedOrders.length 
      : 0;

    return {
      total: filteredOrders.length,
      completed: completedOrders.length,
      totalSales,
      avgTicket,
    };
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Meus Pedidos
          </h1>
          <p className="text-muted-foreground text-sm">
            Histórico de pedidos criados por {name || 'você'}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Pedidos</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Finalizados</p>
                <p className="text-xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Vendido</p>
                <p className="text-xl font-bold">
                  {stats.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold">
                  {stats.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="preparing">Preparando</SelectItem>
                <SelectItem value="ready">Pronto</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[150px]"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajuste os filtros ou faça novos pedidos
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsPreview = items.slice(0, 3).map((item: any) => 
              `${item.quantity}x ${item.name}`
            ).join(', ');
            const config = statusConfig[order.status] || statusConfig.pending;

            return (
              <Card 
                key={order.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">#{order.order_number}</span>
                        <Badge className={cn("text-white", config.color)}>
                          {config.label}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {order.order_type === 'delivery' ? 'Entrega' : 
                           order.order_type === 'pickup' ? 'Retirada' : 'Mesa'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {order.customer_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {itemsPreview}
                        {items.length > 3 && ` +${items.length - 3} itens`}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Order Details Modal - Simple View */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Pedido #{selectedOrder?.order_number}</span>
              <Badge className={cn("text-white", statusConfig[selectedOrder?.status || 'pending']?.color)}>
                {statusConfig[selectedOrder?.status || 'pending']?.label}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Customer Info */}
                <div>
                  <p className="text-sm font-medium">{selectedOrder.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>
                </div>
                
                <Separator />
                
                {/* Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Itens do pedido</h4>
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="text-muted-foreground">
                        {(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                {/* Totals */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{selectedOrder.subtotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {selectedOrder.delivery_fee && selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span>{selectedOrder.delivery_fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  )}
                  {selectedOrder.discount && selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto</span>
                      <span>-{selectedOrder.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">
                      {selectedOrder.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
                
                {/* Notes */}
                {selectedOrder.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-1">Observações</h4>
                      <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                    </div>
                  </>
                )}
                
                {/* Date */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Criado em {format(new Date(selectedOrder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
