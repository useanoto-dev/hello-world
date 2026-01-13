import { Plus, Minus, ShoppingCart, Trash2, CreditCard, Printer, X, MessageSquare, Gift, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/formatters";
import { Table, getItemPrice } from "@/hooks/usePDVData";
import { CartItem } from "@/hooks/usePDVCart";
import { PDVTableHistory } from "./PDVTableHistory";
import { AppliedReward } from "./PDVLoyaltyRedemption";
import { ManualDiscount } from "./PDVManualDiscount";

interface PDVCartPanelProps {
  storeId: string;
  selectedTable: Table | null;
  isCounter: boolean;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  cart: CartItem[];
  getCartItemTotal: (item: CartItem) => number;
  updateQuantity: (itemId: string, delta: number) => void;
  removeFromCart: (itemId: string) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  manualDiscount: ManualDiscount | null;
  manualDiscountAmount: number;
  appliedReward: AppliedReward | null;
  loyaltyDiscount: number;
  finalTotal: number;
  onOpenPayment: () => void;
}

export function PDVCartPanel({
  storeId,
  selectedTable,
  isCounter,
  customerName,
  onCustomerNameChange,
  cart,
  getCartItemTotal,
  updateQuantity,
  removeFromCart,
  updateItemNotes,
  clearCart,
  manualDiscount,
  manualDiscountAmount,
  appliedReward,
  loyaltyDiscount,
  finalTotal,
  onOpenPayment,
}: PDVCartPanelProps) {
  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-card border rounded-lg">
      {/* Cart Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {selectedTable ? `Mesa ${selectedTable.number}` : isCounter ? "Balcão" : "Selecione"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {selectedTable && (
              <PDVTableHistory
                storeId={storeId}
                tableId={selectedTable.id}
                tableNumber={selectedTable.number}
              />
            )}
            {cart.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearCart}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
        
        {(selectedTable || isCounter) && (
          <Input
            placeholder="Nome do cliente"
            value={customerName}
            onChange={e => onCustomerNameChange(e.target.value)}
            className="mt-2 h-8 text-sm"
          />
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1 p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Carrinho vazio</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(cartItem => {
              const itemTotal = getCartItemTotal(cartItem);
              return (
                <div key={cartItem.id} className="p-2 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {cartItem.item.name}
                        {cartItem.selectedVariation && (
                          <span className="text-muted-foreground font-normal"> ({cartItem.selectedVariation.name})</span>
                        )}
                      </p>
                      {cartItem.complements.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {cartItem.complements.map(c => (
                            <p key={c.item.id} className="text-[10px] text-muted-foreground">
                              + {c.quantity}x {c.item.name} ({formatCurrency(getItemPrice(c.item))})
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-primary font-medium mt-1">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(cartItem.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium text-sm">{cartItem.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(cartItem.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeFromCart(cartItem.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Notes field */}
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3 h-3 text-muted-foreground mt-1.5 flex-shrink-0" />
                    <Input
                      placeholder="Observação do item..."
                      value={cartItem.notes || ""}
                      onChange={(e) => updateItemNotes(cartItem.id, e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Cart Footer */}
      <div className="p-4 border-t space-y-3">
        {manualDiscount && (
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Desconto {manualDiscount.type === "percentage" ? `${manualDiscount.value}%` : "manual"}
            </span>
            <span>-{formatCurrency(manualDiscountAmount)}</span>
          </div>
        )}
        {appliedReward && (
          <div className="flex items-center justify-between text-sm text-amber-600">
            <span className="flex items-center gap-1">
              <Gift className="w-3 h-3" />
              {appliedReward.rewardName}
            </span>
            <span>-{formatCurrency(loyaltyDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(finalTotal)}</span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            disabled={cart.length === 0}
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={cart.length === 0 || (!selectedTable && !isCounter)}
            onClick={onOpenPayment}
          >
            <CreditCard className="w-4 h-4" />
            Pagar
          </Button>
        </div>
      </div>
    </div>
  );
}
