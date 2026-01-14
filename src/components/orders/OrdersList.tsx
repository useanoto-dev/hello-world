// Orders List Component - Extracted from OrdersPage
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Clock, Check, Truck, X, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  order_type: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
}

interface OrdersListProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
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

const getOrderTypeEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    delivery: "🛵",
    pickup: "🏪",
    dine_in: "🍽️"
  };
  return emojis[type] || "📦";
};

export const OrdersList = memo(function OrdersList({
  orders,
  onViewOrder,
}: OrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-6 bg-muted/20 rounded-lg">
        <ShoppingBag className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/50" />
        <p className="text-[10px] text-muted-foreground">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <Card className="border-border/40 overflow-hidden">
      <div className="divide-y divide-border/50">
        <AnimatePresence>
          {orders.map((order, index) => {
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
                    <span>{order.items?.length || 0} itens</span>
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
                  onClick={() => onViewOrder(order)}
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
});
