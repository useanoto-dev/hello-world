import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MapPin, CreditCard, Printer, Trash2, Check, X, Clock, Truck, RefreshCw, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

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

interface WhatsAppMessage {
  id: string;
  mensagem: string;
  status_pedido: string;
  data_envio: string;
  enviado_por: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Check },
  preparing: { label: "Preparando", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: RefreshCw },
  ready: { label: "Pronto", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: Check },
  delivering: { label: "Em entrega", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Truck },
  delivered: { label: "Entregue", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Check },
  completed: { label: "Concluído", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", icon: Check },
  canceled: { label: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: X }
};

interface OrderDetailsModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onDelete: (orderId: string) => void;
  onPrint: (order: Order) => void;
  useComandaMode: boolean;
  getNextStatus: (status: string) => string | null;
}

export function OrderDetailsModal({
  order,
  open,
  onOpenChange,
  onUpdateStatus,
  onDelete,
  onPrint,
  useComandaMode,
  getNextStatus
}: OrderDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("detalhes");
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load WhatsApp messages when tab is opened
  useEffect(() => {
    if (open && order && activeTab === "whatsapp") {
      loadWhatsAppMessages();
    }
  }, [open, order, activeTab]);

  // Reset tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab("detalhes");
    }
  }, [open]);

  const loadWhatsAppMessages = async () => {
    if (!order) return;
    
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("historico_whatsapp_pedido")
        .select("*")
        .eq("pedido_id", order.id)
        .order("data_envio", { ascending: false });

      if (error) throw error;
      setWhatsappMessages((data || []) as WhatsAppMessage[]);
    } catch (error) {
      console.error("Error loading WhatsApp messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  if (!order) return null;

  const StatusIcon = statusConfig[order.status]?.icon || Clock;
  const nextStatus = getNextStatus(order.status);

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      delivery: "🛵 Delivery",
      pickup: "🏪 Retirada",
      dine_in: "🍽️ Mesa"
    };
    return labels[type] || type;
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este pedido?")) {
      onDelete(order.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              Pedido #{order.order_number}
            </DialogTitle>
            <Badge className={statusConfig[order.status]?.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[order.status]?.label}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="detalhes" className="text-xs">
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs gap-1">
              <MessageSquare className="w-3 h-3" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="space-y-4 mt-0">
            {/* Customer Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{order.customer_name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.customer_phone}
                </div>
                {order.payment_method && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {order.payment_method}
                  </div>
                )}
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {getOrderTypeLabel(order.order_type)}
                </Badge>
              </div>
            </div>

            {/* Address */}
            {order.address && order.order_type === "delivery" && (
              <div className="flex items-start gap-2 text-xs bg-muted/50 p-2.5 rounded-lg">
                <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>
                  {order.address.street}, {order.address.number}
                  {order.address.complement && ` - ${order.address.complement}`}
                  <br />
                  {order.address.neighborhood} - {order.address.city}
                </span>
              </div>
            )}

            {/* Items */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Itens</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(order.items as OrderItem[])?.map((item, i) => (
                  <div key={i} className="text-xs bg-muted/30 p-2 rounded">
                    <div className="flex justify-between font-medium">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.complements && item.complements.length > 0 && (
                      <div className="pl-3 text-muted-foreground mt-0.5">
                        {item.complements.map((c, ci) => (
                          <div key={ci} className="flex justify-between">
                            <span>+ {c.quantity}x {c.name}</span>
                            <span>R$ {(c.price * c.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-amber-600 dark:text-amber-400 italic mt-0.5">
                        📝 {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrega</span>
                  <span>R$ {order.delivery_fee.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>-R$ {order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-sm pt-1.5 border-t">
                <span>Total</span>
                <span className="text-primary">R$ {order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-2 rounded text-xs">
                <strong>Obs:</strong> {order.notes}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => onPrint(order)}
              >
                <Printer className="w-3 h-3 mr-1" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            {/* Status Actions */}
            {order.status !== "completed" && order.status !== "canceled" && (
              <div className="flex gap-2">
                {useComandaMode && nextStatus && (
                  <Button 
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => {
                      onUpdateStatus(order.id, nextStatus);
                      onOpenChange(false);
                    }}
                  >
                    Marcar como {statusConfig[nextStatus]?.label}
                  </Button>
                )}
                {!useComandaMode && (
                  <Button 
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => {
                      onUpdateStatus(order.id, "completed");
                      onOpenChange(false);
                    }}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Concluir
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    onUpdateStatus(order.id, "canceled");
                    onOpenChange(false);
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-0">
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Mensagens Enviadas
              </h4>

              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : whatsappMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Nenhuma mensagem enviada para este pedido</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {whatsappMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                        >
                          {statusConfig[msg.status_pedido]?.label || msg.status_pedido}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">
                        {msg.mensagem}
                      </p>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        Enviado por: {msg.enviado_por}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
