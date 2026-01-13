// Orders Management - Anotô SaaS - Compact Design
import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, Clock, Check, Truck, X, RefreshCw,
  ChevronLeft, ChevronRight, Eye, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, subDays, startOfDay, endOfDay, isToday, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useStockNotifications } from "@/hooks/useStockNotifications";
import { OrderDetailsModal } from "@/components/admin/OrderDetailsModal";
import { cn } from "@/lib/utils";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  complements?: Array<{ name: string; quantity: number; price: number }>;
}

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  order_type: string;
  order_source: string | null;
  address: any;
  payment_method: string | null;
  notes: string | null;
  status: string;
  paid: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  pending: { label: "Pendente", color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", icon: Clock },
  confirmed: { label: "Confirmado", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: Check },
  preparing: { label: "Preparando", color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30", icon: RefreshCw },
  ready: { label: "Pronto", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", icon: Check },
  delivering: { label: "Em entrega", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30", icon: Truck },
  delivered: { label: "Entregue", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", icon: Check },
  completed: { label: "Concluído", color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-800", icon: Check },
  canceled: { label: "Cancelado", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", icon: X }
};

const statusFlow = ["pending", "confirmed", "preparing", "ready", "delivering", "delivered", "completed"];

export default function OrdersPage() {
  const { store } = useOutletContext<{ store: any }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  useStockNotifications({ storeId: store?.id, enabled: !!store?.id });

  useEffect(() => {
    if (store?.id) {
      loadOrders();
      const unsubscribe = subscribeToOrders();
      return unsubscribe;
    }
  }, [store?.id, selectedDate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString())
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      const mappedOrders = (data || []).map(o => ({
        ...o,
        items: (o.items as unknown as OrderItem[]) || []
      })) as Order[];
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`
        },
        (payload) => {
          const dayStart = startOfDay(selectedDate);
          const dayEnd = endOfDay(selectedDate);
          
          if (payload.eventType === "INSERT") {
            const newOrder = {
              ...payload.new,
              items: (payload.new.items as unknown as OrderItem[]) || []
            } as Order;
            const orderDate = new Date(newOrder.created_at);
            
            if (orderDate >= dayStart && orderDate <= dayEnd) {
              setOrders(prev => [newOrder, ...prev]);
              toast.success("Novo pedido recebido! 🎉");
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = {
              ...payload.new,
              items: (payload.new.items as unknown as OrderItem[]) || []
            } as Order;
            
            setOrders(prev => 
              prev.map(o => o.id === updated.id ? updated : o)
            );
          } else if (payload.eventType === "DELETE") {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Call centralized function that updates status and triggers WhatsApp automation
      const { data, error } = await supabase.functions.invoke("atualizar_status_pedido", {
        body: { pedido_id: orderId, novo_status: newStatus },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || "Erro ao atualizar status");
      }

      toast.success(`Pedido atualizado para ${statusConfig[newStatus].label}`);
      
      // Show WhatsApp notification result if message was sent
      if (data?.whatsapp?.sent) {
        toast.success("Mensagem WhatsApp enviada automaticamente! 📱");
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error(error.message || "Erro ao atualizar");
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
        
      if (error) throw error;
      toast.success("Pedido excluído");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    }
  };

  const printOrder = (order: Order) => {
    toast.info("Função de impressão será implementada");
  };

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSource = sourceFilter === "all" || order.order_source === sourceFilter;
    if (!matchesSource) return false;
    
    if (store?.use_comanda_mode === false) return true;
    
    if (filter === "all") return true;
    if (filter === "active") return !["completed", "canceled"].includes(order.status);
    return order.status === filter;
  });

  const orderSourceCounts = {
    all: orders.length,
    digital: orders.filter(o => o.order_source === "digital").length,
    pdv: orders.filter(o => o.order_source === "pdv").length,
  };

  const financialSummary = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== "canceled");
    const totalSold = validOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = validOrders.length;
    const averageTicket = totalOrders > 0 ? totalSold / totalOrders : 0;
    
    return { totalSold, totalOrders, averageTicket };
  }, [orders]);

  const salesByHourData = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== "canceled");
    const hourlyData: Record<number, { orders: number; sales: number }> = {};
    
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { orders: 0, sales: 0 };
    }
    
    validOrders.forEach(order => {
      const hour = getHours(new Date(order.created_at));
      hourlyData[hour].orders += 1;
      hourlyData[hour].sales += order.total;
    });
    
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: `${hour}h`,
        hourNum: parseInt(hour),
        orders: data.orders,
        sales: data.sales
      }))
      .filter(d => d.hourNum >= 8 && d.hourNum <= 23);
  }, [orders]);

  const getOrderTypeEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      delivery: "🛵",
      pickup: "🏪",
      dine_in: "🍽️"
    };
    return emojis[type] || "📦";
  };

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Pedidos</h1>
          <p className="text-[10px] text-muted-foreground">
            {orders.filter(o => !["completed", "canceled"].includes(o.status)).length} ativos
          </p>
        </div>
        
        <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={goToPreviousDay}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          
          <Button 
            variant={isToday(selectedDate) ? "default" : "ghost"} 
            size="sm"
            onClick={goToToday}
            className="h-6 text-[10px] px-2"
          >
            {isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd/MM", { locale: ptBR })}
          </Button>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={goToNextDay}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Summary Cards - Ultra Compact */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/40">
          <CardContent className="p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Vendas</p>
            <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              R$ {financialSummary.totalSold.toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pedidos</p>
            <p className="text-base font-semibold">{financialSummary.totalOrders}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Ticket</p>
            <p className="text-base font-semibold">R$ {financialSummary.averageTicket.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Compact */}
      {financialSummary.totalOrders > 0 && (
        <Card className="border-border/40">
          <CardContent className="p-3">
            <h3 className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Vendas por Hora</h3>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByHourData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 8 }} 
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis 
                    tick={{ fontSize: 8 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                    width={30}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded px-2 py-1 shadow-lg">
                            <p className="text-xs font-medium">{data.hour} - {data.orders} pedido(s)</p>
                            <p className="text-xs font-bold text-emerald-500">R$ {data.sales.toFixed(0)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sales" radius={[2, 2, 0, 0]}>
                    {salesByHourData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.sales > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                        fillOpacity={entry.sales > 0 ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - Compact Pills */}
      {store?.use_comanda_mode !== false && (
        <div className="flex flex-wrap gap-1">
          {[
            { value: "all", label: "Todos" },
            { value: "active", label: "Ativos" },
            { value: "pending", label: "Pendentes" },
            { value: "completed", label: "Concluídos" }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-full transition-colors",
                filter === f.value 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1 opacity-70">
                  {orders.filter(o => {
                    if (f.value === "active") return !["completed", "canceled"].includes(o.status);
                    return o.status === f.value;
                  }).length}
                </span>
              )}
            </button>
          ))}
          
          <div className="w-px h-5 bg-border mx-1 self-center" />
          
          {[
            { value: "all", label: "Todos", emoji: "" },
            { value: "digital", label: "Digital", emoji: "📱" },
            { value: "pdv", label: "PDV", emoji: "💻" },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setSourceFilter(s.value)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-full transition-colors",
                sourceFilter === s.value 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {s.emoji} {s.label}
              <span className="ml-1 opacity-70">
                {orderSourceCounts[s.value as keyof typeof orderSourceCounts]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Orders List - Compact Table Style */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <Card className="border-border/40 overflow-hidden">
          <div className="divide-y divide-border/50">
            <AnimatePresence>
              {filteredOrders.map((order, index) => {
                const StatusIcon = statusConfig[order.status]?.icon || Clock;
                
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center gap-3 p-2.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Order Number */}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-primary">#{order.order_number}</span>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{order.customer_name}</span>
                        <span className="text-[10px]">{getOrderTypeEmoji(order.order_type)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{format(new Date(order.created_at), "HH:mm")}</span>
                        <span>·</span>
                        <span>{(order.items as any[])?.length || 0} itens</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5",
                      statusConfig[order.status]?.bgColor,
                      statusConfig[order.status]?.color
                    )}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {statusConfig[order.status]?.label}
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="text-xs font-semibold">R$ {order.total.toFixed(2)}</p>
                    </div>

                    {/* View Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openOrderDetails(order)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdateStatus={updateOrderStatus}
        onDelete={deleteOrder}
        onPrint={printOrder}
        useComandaMode={store?.use_comanda_mode !== false}
        getNextStatus={getNextStatus}
      />
    </div>
  );
}
