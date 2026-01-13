import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Clock, ChefHat, CheckCircle2, Truck,
  MapPin, MessageCircle, Printer, Package, ChevronLeft, ChevronRight, PackageCheck,
  Phone, CreditCard, AlertCircle, Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, subDays, startOfDay, endOfDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatters";
import { getPrinter, ComandaData, PrinterWidth, StoreFooterData } from "@/lib/thermalPrinter";
import { ComandaPreviewModal } from "@/components/admin/ComandaPreviewModal";
import { useOrderTypeSounds } from "@/hooks/useOrderTypeSounds";
import { getPrinterStatus } from "@/lib/printnode";
import { 
  isUSBPrintingSupported, 
  connectUSBPrinter, 
  disconnectUSBPrinter,
  printComanda,
  showPrintResultToast,
  isUSBPrinterConnected
} from "@/services/PrintService";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  size?: string;
  flavors?: Array<{ name: string }>;
  extras?: {
    border?: { name: string };
    toppings?: Array<{ name: string }>;
  };
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
  total: number;
  order_type: string;
  order_source: string | null;
  address: any;
  payment_method: string | null;
  payment_change: number | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const statusColumns = [
  { 
    status: "pending", 
    label: "Novos", 
    icon: Clock, 
    color: "from-amber-500 to-yellow-500",
    iconBg: "bg-amber-500",
    headerBg: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40",
    borderColor: "border-amber-200 dark:border-amber-800"
  },
  { 
    status: "preparing", 
    label: "Preparando", 
    icon: ChefHat, 
    color: "from-orange-500 to-red-500",
    iconBg: "bg-orange-500",
    headerBg: "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/40 dark:to-red-950/40",
    borderColor: "border-orange-200 dark:border-orange-800"
  },
  { 
    status: "ready", 
    label: "Pronto", 
    icon: CheckCircle2, 
    color: "from-emerald-500 to-green-500",
    iconBg: "bg-emerald-500",
    headerBg: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-800"
  },
  { 
    status: "delivering", 
    label: "Entregando", 
    icon: Truck, 
    color: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-500",
    headerBg: "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  { 
    status: "delivered", 
    label: "Entregue", 
    icon: PackageCheck, 
    color: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-500",
    headerBg: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40",
    borderColor: "border-violet-200 dark:border-violet-800"
  },
];

const orderTypeLabels: Record<string, { label: string; emoji: string; short: string }> = {
  delivery: { label: "Delivery", emoji: "🛵", short: "DEL" },
  pickup: { label: "Retirada", emoji: "🏪", short: "RET" },
  dine_in: { label: "Mesa", emoji: "🍽️", short: "MES" }
};

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
};

function OrderCard({ 
  order, 
  nextStatus, 
  onUpdateStatus, 
  onOpenPreview, 
  onOpenWhatsApp 
}: { 
  order: Order; 
  nextStatus: string | null; 
  onUpdateStatus: (id: string, status: string) => void;
  onOpenPreview: (order: Order) => void;
  onOpenWhatsApp: (order: Order) => void;
}) {
  const orderType = orderTypeLabels[order.order_type] || orderTypeLabels.delivery;
  const isDelivery = order.order_type === "delivery";
  const hasNotes = !!order.notes;

  return (
    <Card className="overflow-hidden bg-card border-border/60 hover:shadow-md">
      {/* Order Header */}
      <div className="p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">#{order.order_number}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {orderType.emoji} {orderType.short}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onOpenPreview(order)}
            >
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              {format(new Date(order.created_at), "HH:mm")}
            </span>
          </div>
        </div>
        
        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-medium text-sm truncate flex-1">{order.customer_name}</span>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="px-3 py-2 border-t border-border/40 max-h-28 overflow-y-auto">
        {order.items.slice(0, 4).map((item, i) => (
          <div key={i} className="py-0.5">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-medium text-muted-foreground">{item.quantity}x</span>
              <span className="truncate">{item.name}</span>
              {item.size && <span className="text-muted-foreground">({item.size})</span>}
            </div>
            {item.complements && item.complements.length > 0 && (
              <div className="pl-4 text-[10px] text-muted-foreground">
                {item.complements.map((c, ci) => (
                  <div key={ci}>+ {c.quantity}x {c.name}</div>
                ))}
              </div>
            )}
            {item.notes && (
              <div className="pl-4 text-[10px] text-amber-600 dark:text-amber-400 italic">
                📝 {item.notes}
              </div>
            )}
          </div>
        ))}
        {order.items.length > 4 && (
          <span className="text-[10px] text-muted-foreground">
            +{order.items.length - 4} mais...
          </span>
        )}
      </div>

      {/* Address for Delivery */}
      {isDelivery && order.address && (
        <div className="px-3 py-1.5 border-t border-border/40 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-start gap-1.5 text-xs">
            <MapPin className="w-3 h-3 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-blue-700 dark:text-blue-300 line-clamp-2">
              {order.address.street}, {order.address.number}
              {order.address.complement && ` - ${order.address.complement}`}
              <span className="text-blue-600/70 dark:text-blue-400/70"> • {order.address.neighborhood}</span>
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      {hasNotes && (
        <div className="px-3 py-1.5 border-t border-border/40 bg-amber-50/70 dark:bg-amber-950/30">
          <div className="flex items-start gap-1.5 text-xs">
            <AlertCircle className="w-3 h-3 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-300 line-clamp-2">{order.notes}</span>
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="px-3 py-1.5 border-t border-border/40 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CreditCard className="w-3 h-3" />
        <span>{order.payment_method ? paymentLabels[order.payment_method] || order.payment_method : "Não informado"}</span>
        {order.payment_change && order.payment_change > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            (Troco p/ {formatCurrency(order.payment_change)})
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="p-2 border-t border-border/40 flex gap-1.5 bg-muted/20">
        <Button 
          size="sm" 
          variant="outline"
          className="flex-1 h-8 text-xs gap-1"
          onClick={() => onOpenWhatsApp(order)}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </Button>
        
        {nextStatus && (
          <Button 
            size="sm" 
            className="flex-1 h-8 text-xs font-medium"
            onClick={() => onUpdateStatus(order.id, nextStatus)}
          >
            Avançar →
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function ComandaPanel() {
  const { store } = useOutletContext<{ store: any }>();
  const { playOrderSound } = useOrderTypeSounds();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    const saved = localStorage.getItem('comanda-auto-print-enabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [printerConnected, setPrinterConnected] = useState(false);
  const [usbSupported, setUsbSupported] = useState(true);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [orderSourceFilter, setOrderSourceFilter] = useState<string>("all");
  const [printNodeStatus, setPrintNodeStatus] = useState<'online' | 'offline' | 'checking' | null>(null);
  const printNodePrevStatusRef = useRef<'online' | 'offline' | null>(null);
  const previousOrdersRef = useRef<string[]>([]);
  const autoPrintEnabledRef = useRef(autoPrintEnabled);
  const printerConnectedRef = useRef(printerConnected);

  useEffect(() => {
    autoPrintEnabledRef.current = autoPrintEnabled;
    localStorage.setItem('comanda-auto-print-enabled', String(autoPrintEnabled));
  }, [autoPrintEnabled]);

  useEffect(() => {
    printerConnectedRef.current = printerConnected;
  }, [printerConnected]);

  useEffect(() => {
    const printer = getPrinter();
    setPrinterConnected(printer.isConnected());
    setUsbSupported(isUSBPrintingSupported());
  }, []);

  // Memoize selected date boundaries to prevent unnecessary re-renders
  const dateBoundaries = useMemo(() => ({
    dayStart: startOfDay(selectedDate),
    dayEnd: endOfDay(selectedDate)
  }), [selectedDate.toDateString()]);

  // Check PrintNode printer status periodically
  useEffect(() => {
    if (!store?.printnode_printer_id) {
      setPrintNodeStatus(null);
      printNodePrevStatusRef.current = null;
      return;
    }

    const checkStatus = async () => {
      setPrintNodeStatus('checking');
      const result = await getPrinterStatus(Number(store.printnode_printer_id));
      const newStatus = result.online ? 'online' : 'offline';
      
      // Notify if printer went offline (was online before)
      if (printNodePrevStatusRef.current === 'online' && newStatus === 'offline') {
        toast.error(`🖨️ Impressora offline: ${store.printnode_printer_name || 'PrintNode'}`, {
          description: 'A impressora ficou indisponível. Verifique a conexão.',
          duration: 10000,
        });
      }
      
      // Notify if printer came back online
      if (printNodePrevStatusRef.current === 'offline' && newStatus === 'online') {
        toast.success(`🖨️ Impressora online: ${store.printnode_printer_name || 'PrintNode'}`, {
          description: 'A impressora está disponível novamente.',
          duration: 5000,
        });
      }
      
      printNodePrevStatusRef.current = newStatus;
      setPrintNodeStatus(newStatus);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [store?.printnode_printer_id, store?.printnode_printer_name]);

  useEffect(() => {
    if (store?.id) {
      loadOrders();
      const unsubscribe = subscribeToOrders();
      const interval = setInterval(loadOrders, 30000);
      
      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [store?.id, selectedDate]);

  const loadOrders = async () => {
    try {
      const { dayStart, dayEnd } = dateBoundaries;
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString())
        .neq("status", "completed")
        .neq("status", "canceled")
        .order("created_at", { ascending: true });
        
      if (error) throw error;
      
      const mappedOrders = (data || []).map(o => ({
        ...o,
        items: (o.items as unknown as OrderItem[]) || []
      })) as Order[];
      
      previousOrdersRef.current = mappedOrders.map(o => o.id);
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };


  const subscribeToOrders = () => {
    const channel = supabase
      .channel("comanda-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = {
              ...payload.new,
              items: (payload.new.items as unknown as OrderItem[]) || []
            } as Order;
            
            const orderDate = new Date(newOrder.created_at);
            if (orderDate >= startOfDay(selectedDate) && orderDate <= endOfDay(selectedDate)) {
              if (!previousOrdersRef.current.includes(newOrder.id)) {
                // Play sound based on order type
                playOrderSound(newOrder.order_type);
                
                const orderEmoji = newOrder.order_type === "delivery" ? "🛵" : 
                                   newOrder.order_type === "pickup" ? "🏪" : "🍽️";
                toast.success(`${orderEmoji} Novo Pedido #${newOrder.order_number}`, {
                  description: `${newOrder.customer_name} • ${formatCurrency(newOrder.total)}`,
                  duration: 10000,
                });

                // Auto print via PrintNode (always available if configured) or local printer
                if ((store?.printnode_printer_id && store?.printnode_auto_print) || (autoPrintEnabledRef.current && printerConnectedRef.current)) {
                  autoPrintOrder(newOrder);
                }
                
                previousOrdersRef.current.push(newOrder.id);
              }
              
              setOrders(prev => {
                if (["pending", "preparing", "ready", "delivering", "delivered"].includes(newOrder.status)) {
                  return [...prev, newOrder].sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                }
                return prev;
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = {
              ...payload.new,
              items: (payload.new.items as unknown as OrderItem[]) || []
            } as Order;
            
            setOrders(prev => {
              if (["completed", "canceled"].includes(updated.status)) {
                return prev.filter(o => o.id !== updated.id);
              }
              return prev.map(o => o.id === updated.id ? updated : o);
            });
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

  const updateStatus = async (orderId: string, newStatus: string) => {
    const previousOrders = [...orders];
    
    // Optimistic update
    setOrders(prev => {
      if (["completed", "canceled"].includes(newStatus)) {
        return prev.filter(o => o.id !== orderId);
      }
      return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    });

    try {
      // Use centralized function to update status and trigger WhatsApp automation
      const { data, error } = await supabase.functions.invoke("atualizar_status_pedido", {
        body: { pedido_id: orderId, novo_status: newStatus },
      });
        
      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || "Erro ao atualizar status");
      }
      
      toast.success(`Pedido movido para ${statusColumns.find(s => s.status === newStatus)?.label}`);
      
      // Show WhatsApp notification if message was sent
      if (data?.whatsapp?.sent) {
        toast.success("Mensagem WhatsApp enviada! 📱", { duration: 3000 });
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      setOrders(previousOrders);
      toast.error(error.message || "Erro ao atualizar");
    }
  };

  const buildComandaData = (order: Order, customNotes?: string): ComandaData => ({
    order_number: order.order_number,
    hora: format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR }),
    cliente: order.customer_name,
    whatsapp: order.customer_phone,
    endereco: order.address ? `${order.address.street}, ${order.address.number}${order.address.complement ? ` - ${order.address.complement}` : ""}, ${order.address.neighborhood}` : undefined,
    referencia: order.address?.reference,
    forma_pagamento: order.payment_method ? (paymentLabels[order.payment_method] || order.payment_method) : "Não informado",
    troco: order.payment_change ? formatCurrency(order.payment_change) : undefined,
    items: order.items.flatMap(item => [
      {
        qty: item.quantity,
        nome: item.name + (item.size ? ` (${item.size})` : "") + (item.flavors?.length ? ` - ${item.flavors.map(f => f.name).join(", ")}` : ""),
        observacao: item.notes || (customNotes !== undefined ? customNotes : undefined)
      },
      ...(item.complements || []).map(c => ({
        qty: c.quantity * item.quantity,
        nome: `  + ${c.name}`
      }))
    ]),
    total: order.total,
    taxa_entrega: order.delivery_fee || 0,
    tipo_servico: order.order_type as 'delivery' | 'pickup' | 'dine_in'
  });

  const autoPrintOrder = async (order: Order, skipStatusUpdate = false) => {
    const comandaData = buildComandaData(order);
    const printerWidth = (store?.printer_width as PrinterWidth) || '80mm';
    
    // Automatically move to "preparing" status when auto-printing
    if (!skipStatusUpdate && order.status === 'pending') {
      try {
        await supabase
          .from("orders")
          .update({ status: 'preparing' })
          .eq("id", order.id);
        
        // Update local state
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'preparing' } : o));
      } catch (error) {
        console.error('Error updating order status:', error);
      }
    }
    
    const storeInfo: StoreFooterData = {
      nome: store?.name,
      endereco: store?.address || undefined,
      telefone: store?.phone || undefined,
      whatsapp: store?.whatsapp || undefined,
      mensagemPersonalizada: (store as any)?.print_footer_message || undefined
    };
    
    const result = await printComanda(comandaData, {
      printerWidth,
      printNodePrinterId: (store?.printnode_auto_print && store?.printnode_printer_id) ? store.printnode_printer_id : undefined,
      storeId: store?.id,
      orderId: order.id,
      orderNumber: order.order_number,
      printerName: store?.printnode_printer_name || undefined,
      maxRetries: store?.printnode_max_retries ?? 2,
      logoUrl: store?.logo_url || undefined,
      storeInfo
    });
    
    if (result.success) {
      const icon = result.method === 'printnode' ? '☁️' : '🖨️';
      toast.success(`${icon} Comanda #${order.order_number} impressa e movida para Preparando`, { duration: 3000 });
    } else {
      toast.error(`❌ Falha na impressão #${order.order_number}`, {
        description: result.error,
        duration: 10000,
      });
    }
  };

  const handlePrintFromPreview = async (order: Order, customNotes: string) => {
    setIsPrinting(true);
    const comandaData = buildComandaData(order, customNotes);
    const printerWidth = (store?.printer_width as PrinterWidth) || '80mm';
    
    const storeInfo: StoreFooterData = {
      nome: store?.name,
      endereco: store?.address || undefined,
      telefone: store?.phone || undefined,
      whatsapp: store?.whatsapp || undefined,
      mensagemPersonalizada: (store as any)?.print_footer_message || undefined
    };
    
    // For preview print, always try PrintNode if configured (regardless of auto_print setting)
    const result = await printComanda(comandaData, {
      printerWidth,
      printNodePrinterId: store?.printnode_printer_id || undefined,
      storeId: store?.id,
      orderId: order.id,
      orderNumber: order.order_number,
      printerName: store?.printnode_printer_name || undefined,
      maxRetries: store?.printnode_max_retries ?? 2,
      logoUrl: store?.logo_url || undefined,
      storeInfo
    });
    
    showPrintResultToast(result, order.order_number);
    
    if (result.success) {
      setPreviewOrder(null);
    }
    
    // Update printer connection state if USB was used
    if (result.method === 'usb') {
      setPrinterConnected(isUSBPrinterConnected());
      printerConnectedRef.current = isUSBPrinterConnected();
    }
    
    setIsPrinting(false);
  };

  const handleConnectPrinter = async () => {
    const printer = getPrinter();
    
    if (printer.isConnected()) {
      await disconnectUSBPrinter();
      setPrinterConnected(false);
      printerConnectedRef.current = false;
      toast.info("Impressora desconectada");
    } else {
      const result = await connectUSBPrinter();
      if (result.success) {
        setPrinterConnected(true);
        printerConnectedRef.current = true;
        toast.success("Impressora conectada!");
      } else {
        toast.error(result.error || "Não foi possível conectar à impressora");
      }
    }
  };

  const openWhatsApp = (order: Order) => {
    const cleanPhone = order.customer_phone.replace(/\D/g, "");
    const orderType = orderTypeLabels[order.order_type] || orderTypeLabels.delivery;
    
    const itemsList = order.items
      .map(item => {
        let itemText = `• ${item.quantity}x ${item.name}`;
        if (item.size) itemText += ` (${item.size})`;
        if (item.flavors && item.flavors.length > 0) {
          itemText += ` - ${item.flavors.map(f => f.name).join(", ")}`;
        }
        return itemText;
      })
      .join("\n");
    
    const paymentText = order.payment_method 
      ? paymentLabels[order.payment_method] || order.payment_method 
      : "Não informado";
    
    let addressText = "";
    if (order.order_type === "delivery" && order.address) {
      addressText = `\n\n📍 *Endereço:*\n${order.address.street}, ${order.address.number}${order.address.complement ? ` - ${order.address.complement}` : ""}\n${order.address.neighborhood}${order.address.reference ? `\nRef: ${order.address.reference}` : ""}`;
    }
    
    const message = `Olá *${order.customer_name}*! 👋

Seu pedido *#${order.order_number}* está sendo preparado! 🍕

*Itens:*
${itemsList}

${order.order_type === "delivery" ? `🛵 *Entrega:* ${formatCurrency(order.delivery_fee || 0)}` : ""}
💰 *Total:* ${formatCurrency(order.total)}
💳 *Pagamento:* ${paymentText}
📦 *Tipo:* ${orderType.emoji} ${orderType.label}${addressText}${order.notes ? `\n\n📝 *Obs:* ${order.notes}` : ""}

Qualquer dúvida estamos à disposição! 😊`;

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const getNextStatus = (current: string): string | null => {
    const flow = ["pending", "preparing", "ready", "delivering", "delivered"];
    const idx = flow.indexOf(current);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter(o => {
      const matchesStatus = o.status === status;
      const matchesType = orderTypeFilter === "all" || o.order_type === orderTypeFilter;
      const matchesSource = orderSourceFilter === "all" || o.order_source === orderSourceFilter;
      return matchesStatus && matchesType && matchesSource;
    });
  };

  const orderTypeCounts = {
    all: orders.length,
    delivery: orders.filter(o => o.order_type === "delivery").length,
    pickup: orders.filter(o => o.order_type === "pickup").length,
    dine_in: orders.filter(o => o.order_type === "dine_in").length,
  };

  const orderSourceCounts = {
    all: orders.length,
    digital: orders.filter(o => o.order_source === "digital").length,
    pdv: orders.filter(o => o.order_source === "pdv").length,
  };

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando pedidos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col gap-2">
        {/* Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold">Cozinha</h1>
            <p className="text-[11px] text-muted-foreground">
              {orders.length} ativos {isToday(selectedDate) ? "hoje" : `em ${format(selectedDate, "dd/MM", { locale: ptBR })}`}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* PrintNode Status Indicator */}
            {store?.printnode_printer_id && (
              <div 
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  printNodeStatus === 'online' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                    : printNodeStatus === 'offline'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                    : 'bg-muted text-muted-foreground'
                }`}
                title={`${store.printnode_printer_name || 'PrintNode'}: ${printNodeStatus === 'online' ? 'Online' : printNodeStatus === 'offline' ? 'Offline' : 'Verificando...'}`}
              >
                <Cloud className="w-4 h-4" />
                <span 
                  className={`w-2 h-2 rounded-full ${
                    printNodeStatus === 'online' 
                      ? 'bg-emerald-500 animate-pulse' 
                      : printNodeStatus === 'offline'
                      ? 'bg-red-500'
                      : 'bg-muted-foreground animate-pulse'
                  }`} 
                />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {store.printnode_printer_name || (printNodeStatus === 'online' ? 'Online' : printNodeStatus === 'offline' ? 'Offline' : '...')}
                </span>
              </div>
            )}

            {/* USB Printer Button - only show if supported */}
            {usbSupported ? (
              <Button 
                variant={printerConnected ? "default" : "outline"} 
                size="sm"
                onClick={handleConnectPrinter}
                className="gap-2 h-9"
              >
                <Printer className="w-4 h-4" />
                {printerConnected ? "Conectada" : "Impressora"}
              </Button>
            ) : (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 cursor-help"
                title="Impressão USB não disponível neste ambiente. Use PrintNode ou impressão A4."
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">USB indisponível</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <Switch 
                checked={autoPrintEnabled} 
                onCheckedChange={setAutoPrintEnabled}
                disabled={!printerConnected && !store?.printnode_auto_print}
              />
              <span className="text-muted-foreground hidden sm:inline">Auto-print</span>
            </div>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-center gap-1 bg-muted/40 rounded-lg p-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button 
            variant={isToday(selectedDate) ? "default" : "outline"} 
            onClick={goToToday}
            size="sm"
            className="min-w-[180px] h-8 text-sm font-medium"
          >
            {isToday(selectedDate) ? "📅 Hoje" : format(selectedDate, "EEEE", { locale: ptBR })}
            {" • "}
            {format(selectedDate, "dd/MM", { locale: ptBR })}
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Order Type Filter */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {[
            { key: "all", label: "Todos", emoji: "📋" },
            { key: "delivery", label: "Delivery", emoji: "🛵" },
            { key: "pickup", label: "Retirada", emoji: "🏪" },
            { key: "dine_in", label: "Mesa", emoji: "🍽️" },
          ].map(type => (
            <Button
              key={type.key}
              variant={orderTypeFilter === type.key ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderTypeFilter(type.key)}
              className="gap-1 h-8 text-xs"
            >
              {type.emoji} {type.label}
              <Badge 
                variant={orderTypeFilter === type.key ? "secondary" : "outline"} 
                className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]"
              >
                {orderTypeCounts[type.key as keyof typeof orderTypeCounts]}
              </Badge>
            </Button>
          ))}

          {/* Separator */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Order Source Filter */}
          {[
            { key: "all", label: "Todas Origens", emoji: "🔄" },
            { key: "digital", label: "Digital", emoji: "📱" },
            { key: "pdv", label: "PDV", emoji: "💻" },
          ].map(source => (
            <Button
              key={source.key}
              variant={orderSourceFilter === source.key ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderSourceFilter(source.key)}
              className="gap-1 h-8 text-xs"
            >
              {source.emoji} {source.label}
              <Badge 
                variant={orderSourceFilter === source.key ? "secondary" : "outline"} 
                className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]"
              >
                {orderSourceCounts[source.key as keyof typeof orderSourceCounts]}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 overflow-hidden min-h-0">
        {statusColumns.map(column => {
          const columnOrders = getOrdersByStatus(column.status);
          const Icon = column.icon;
          
          return (
            <div 
              key={column.status} 
              className={`flex flex-col rounded-xl bg-card border ${column.borderColor} overflow-hidden`}
            >
              {/* Column Header */}
              <div className={`p-3 ${column.headerBg} border-b ${column.borderColor}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${column.iconBg} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-sm">{column.label}</span>
                  </div>
                  <Badge variant="secondary" className="font-bold">
                    {columnOrders.length}
                  </Badge>
                </div>
              </div>
              
              {/* Orders */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted/10">
                {columnOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    nextStatus={getNextStatus(order.status)}
                    onUpdateStatus={updateStatus}
                    onOpenPreview={setPreviewOrder}
                    onOpenWhatsApp={openWhatsApp}
                  />
                ))}
                
                {columnOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Package className="w-10 h-10 mb-2 opacity-30" />
                    <span className="text-xs">Nenhum pedido</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comanda Preview Modal */}
      <ComandaPreviewModal
        order={previewOrder}
        open={!!previewOrder}
        onClose={() => setPreviewOrder(null)}
        onPrint={handlePrintFromPreview}
        isPrinting={isPrinting}
      />
    </div>
  );
}
