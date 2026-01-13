import { useState, useEffect } from "react";
import { History, Receipt, Clock, User, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderHistoryItem {
  id: string;
  order_number: number;
  customer_name: string;
  items: unknown;
  subtotal: number;
  total: number;
  discount: number | null;
  status: string | null;
  payment_method: string | null;
  created_at: string | null;
}

interface PDVTableHistoryProps {
  storeId: string;
  tableId: string | null;
  tableNumber: string;
}

export function PDVTableHistory({ storeId, tableId, tableNumber }: PDVTableHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    if (!tableId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .eq("table_id", tableId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading table history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tableId) {
      loadHistory();
    }
  }, [isOpen, tableId]);

  if (!tableId) return null;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      preparing: "Preparando",
      ready: "Pronto",
      delivered: "Entregue",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      preparing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  // Calculate totals
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;

  const parseItems = (items: unknown): any[] => {
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
      try {
        return JSON.parse(items);
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <History className="w-3.5 h-3.5" />
        Histórico
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-0">
            {/* Paper receipt header */}
            <div className="bg-[#fef9e7] dark:bg-amber-950/20 border-b-2 border-dashed border-amber-200 dark:border-amber-800">
              <div className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Receipt className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <DialogTitle className="text-lg font-mono font-bold text-amber-800 dark:text-amber-300">
                    HISTÓRICO DA MESA
                  </DialogTitle>
                </div>
                <p className="font-mono text-xl font-bold text-amber-900 dark:text-amber-200">
                  Mesa {tableNumber}
                </p>
                <p className="font-mono text-xs text-amber-600 dark:text-amber-500 mt-1">
                  {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Summary strip */}
              <div className="flex justify-between px-4 py-2 bg-amber-100/50 dark:bg-amber-900/20 font-mono text-xs border-t border-amber-200 dark:border-amber-800">
                <span className="text-amber-700 dark:text-amber-400">
                  Total Pedidos: <strong>{totalOrders}</strong>
                </span>
                <span className="text-amber-700 dark:text-amber-400">
                  Total Gasto: <strong>{formatCurrency(totalSpent)}</strong>
                </span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="bg-[#fef9e7] dark:bg-amber-950/10">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center font-mono text-amber-600 dark:text-amber-500">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>Nenhum pedido nesta mesa</p>
                </div>
              ) : (
                <div className="divide-y-2 divide-dashed divide-amber-200 dark:divide-amber-800">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 font-mono text-sm">
                      {/* Order header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-900 dark:text-amber-200">
                            #{order.order_number}
                          </span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(order.status || '')}`}>
                            {getStatusLabel(order.status || '')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                          <Clock className="w-3 h-3" />
                          {order.created_at && format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 mb-2">
                        <User className="w-3 h-3" />
                        {order.customer_name}
                      </div>

                      {/* Items */}
                      <div className="space-y-1 mb-3 pl-2 border-l-2 border-amber-200 dark:border-amber-700">
                        {parseItems(order.items).map((item, idx) => (
                          <div key={idx} className="text-xs text-amber-800 dark:text-amber-300">
                            <div className="flex justify-between">
                              <span>{item.quantity}x {item.name}</span>
                              <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
                            </div>
                            {item.complements && item.complements.length > 0 && (
                              <div className="pl-3 text-amber-600 dark:text-amber-500">
                                {item.complements.map((c: any, cIdx: number) => (
                                  <div key={cIdx} className="flex justify-between">
                                    <span>+ {c.quantity}x {c.name}</span>
                                    <span>{formatCurrency((c.price || 0) * c.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Order totals */}
                      <div className="pt-2 border-t border-amber-200 dark:border-amber-700 space-y-0.5">
                        <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
                          <span>Subtotal</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        {(order.discount ?? 0) > 0 && (
                          <div className="flex justify-between text-xs text-emerald-600">
                            <span>Desconto</span>
                            <span>-{formatCurrency(order.discount ?? 0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-amber-900 dark:text-amber-200">
                          <span>TOTAL</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                        {order.payment_method && (
                          <div className="text-xs text-amber-600 dark:text-amber-500 text-right">
                            {order.payment_method}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Paper tear effect footer */}
          <div className="bg-[#fef9e7] dark:bg-amber-950/10 border-t-2 border-dashed border-amber-200 dark:border-amber-800 p-3">
            <p className="text-center font-mono text-xs text-amber-600 dark:text-amber-500">
              ★ ★ ★ FIM DO HISTÓRICO ★ ★ ★
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
