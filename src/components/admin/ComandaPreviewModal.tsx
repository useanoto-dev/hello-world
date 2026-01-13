import { useState } from "react";
import { Printer, X, MapPin, Phone, CreditCard, Truck, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  flavors?: Array<{ name: string }>;
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
  address: any;
  payment_method: string | null;
  payment_change: number | null;
  notes: string | null;
  created_at: string;
}

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
};

const orderTypeConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  delivery: { label: "ENTREGAR", icon: Truck, color: "bg-blue-500" },
  pickup: { label: "RETIRAR", icon: Store, color: "bg-orange-500" },
  dine_in: { label: "MESA", icon: UtensilsCrossed, color: "bg-green-500" },
};

interface ComandaPreviewModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onPrint: (order: Order, customNotes: string) => void;
  isPrinting?: boolean;
}

export function ComandaPreviewModal({ order, open, onClose, onPrint, isPrinting }: ComandaPreviewModalProps) {
  const [customNotes, setCustomNotes] = useState("");

  // Reset notes when order changes
  if (order && customNotes === "" && order.notes) {
    setCustomNotes(order.notes);
  }

  const handleClose = () => {
    setCustomNotes("");
    onClose();
  };

  const handlePrint = () => {
    if (order) {
      onPrint(order, customNotes);
    }
  };

  if (!order) return null;

  const orderTypeInfo = orderTypeConfig[order.order_type] || orderTypeConfig.delivery;
  const OrderTypeIcon = orderTypeInfo.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Preview da Comanda</DialogTitle>
        </DialogHeader>

        {/* Comanda Preview - Styled like a receipt */}
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-border rounded-md p-3 font-mono text-xs space-y-2.5">
          {/* Header */}
          <div className="text-center border-b border-dashed border-border pb-2.5">
            <p className="font-bold text-sm">COMANDA</p>
            <p className="text-2xl font-black text-primary">#{order.order_number}</p>
            <p className="text-muted-foreground text-[10px] mt-0.5">
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Customer Info */}
          <div className="border-b border-dashed border-border pb-2.5 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold">CLIENTE:</span>
              <span>{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Phone className="w-2.5 h-2.5" />
              <span>{order.customer_phone}</span>
            </div>
            
            {order.order_type === "delivery" && order.address && (
              <div className="flex items-start gap-1.5 text-muted-foreground mt-1.5">
                <MapPin className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                <div className="text-[10px]">
                  <p>{order.address.street}, {order.address.number}</p>
                  {order.address.complement && <p>{order.address.complement}</p>}
                  <p>{order.address.neighborhood}</p>
                  {order.address.reference && <p className="italic">Ref: {order.address.reference}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-border pb-2.5">
            <p className="font-bold mb-1.5 text-xs">ITENS</p>
            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <div className="flex-1">
                    <span className="font-medium">{item.quantity}x</span>{" "}
                    <span>{item.name}</span>
                    {item.size && <span className="text-muted-foreground"> ({item.size})</span>}
                    {item.flavors && item.flavors.length > 0 && (
                      <p className="text-[10px] text-muted-foreground pl-3">
                        {item.flavors.map(f => f.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-b border-dashed border-border pb-2.5 space-y-0.5 text-[11px]">
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de entrega:</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="border-b border-dashed border-border pb-2.5">
            <div className="flex items-center gap-1.5 text-[11px]">
              <CreditCard className="w-3 h-3" />
              <span className="font-semibold">PAGAMENTO:</span>
              <span>{order.payment_method ? paymentLabels[order.payment_method] || order.payment_method : "Não informado"}</span>
            </div>
            {order.payment_change && (
              <p className="text-muted-foreground text-[10px] ml-4">
                Troco para: {formatCurrency(order.payment_change)}
              </p>
            )}
          </div>

          {/* Service Type Badge */}
          <div className="flex justify-center pt-1.5">
            <div className={`${orderTypeInfo.color} text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs`}>
              <OrderTypeIcon className="w-3.5 h-3.5" />
              {orderTypeInfo.label}
            </div>
          </div>
        </div>

        {/* Editable Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-medium">
            Observações para impressão
          </Label>
          <Textarea
            id="notes"
            placeholder="Adicione observações..."
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            className="min-h-[60px] resize-none text-xs"
            maxLength={200}
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {customNotes.length}/200
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose} className="flex-1 h-8 text-xs">
            Cancelar
          </Button>
          <Button size="sm" onClick={handlePrint} disabled={isPrinting} className="flex-1 h-8 text-xs gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            {isPrinting ? "Imprimindo..." : "Imprimir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
