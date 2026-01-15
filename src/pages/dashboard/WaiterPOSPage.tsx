import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Plus, Minus, Check, X, Tag, ShoppingCart, Trash2, MessageSquare
} from "lucide-react";
import { PDVPaymentSection, SplitPayment } from "@/components/pdv/PDVPaymentSection";
import { PDVProductsPanel } from "@/components/pdv/PDVProductsPanel";
import { PDVTableSelectionModal } from "@/components/pdv/PDVTableSelectionModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { usePDVData, Table, getItemPrice } from "@/hooks/usePDVData";
import { usePDVCart } from "@/hooks/usePDVCart";
import { useStaffAuth } from "@/hooks/useStaffAuth";

export default function WaiterPOSPage() {
  const { store } = useOutletContext<{ store: any }>();
  const { staffId, name: waiterName } = useStaffAuth();
  
  const {
    tables,
    setTables,
    paymentMethods,
    allOptionItems,
    loading,
    allDisplayItems,
    allDisplayCategories,
    getSecondaryGroups,
    getGroupItems,
  } = usePDVData(store?.id);

  const {
    cart,
    customerName,
    setCustomerName,
    isComplementsOpen,
    setIsComplementsOpen,
    selectedProduct,
    selectedComplements,
    isVariationsOpen,
    setIsVariationsOpen,
    productForVariation,
    splitPayments,
    setSplitPayments,
    openComplementsModal,
    toggleComplement,
    addComplementQuantity,
    confirmAddToCart,
    addToCartWithVariation,
    updateQuantity,
    removeFromCart,
    updateItemNotes,
    clearCart,
    getCartItemTotal,
    cartTotal,
    finalTotal,
    complementsTotal,
  } = usePDVCart(getSecondaryGroups, getGroupItems, allOptionItems);

  // Cart drawer state
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Table selection modal
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isCounter, setIsCounter] = useState(true);
  
  // Payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-set customer name with waiter name
  useEffect(() => {
    if (waiterName && customerName === "Cliente") {
      setCustomerName(`Garçom: ${waiterName}`);
    }
  }, [waiterName, customerName, setCustomerName]);

  const handleFinishOrder = () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    setIsCartOpen(false);
    setIsTableSelectionOpen(true);
  };

  const handleTableSelected = async (table: Table | null, isCounterOrder: boolean) => {
    if (table) {
      setSelectedTable(table);
      setIsCounter(false);
      
      // Occupy table if available
      if (table.status === "available") {
        await supabase
          .from("tables")
          .update({ status: "occupied", updated_at: new Date().toISOString() })
          .eq("id", table.id);
          
        setTables(prev => prev.map(t => 
          t.id === table.id ? { ...t, status: "occupied" } : t
        ));
      }
      
      // Send directly to kitchen
      await handleSendToKitchen(table);
    } else {
      setSelectedTable(null);
      setIsCounter(true);
      // Counter orders: open payment modal
      setIsPaymentOpen(true);
    }
  };

  const handleSendToKitchen = async (table: Table) => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const orderData = {
        store_id: store.id,
        customer_name: `Mesa ${table.number} - ${waiterName || 'Garçom'}`,
        customer_phone: "00000000000",
        order_type: "dine_in",
        staff_id: staffId,
        items: cart.map(cartItem => {
          let productId: string | undefined = undefined;
          const itemId = cartItem.item.id;
          
          if (itemId.startsWith('prod-')) {
            productId = itemId.substring(5);
          } else if (itemId.startsWith('inv-')) {
            productId = itemId.substring(4);
          }
          
          const itemData: Record<string, unknown> = {
            id: itemId,
            name: cartItem.item.name,
            quantity: cartItem.quantity,
            price: getItemPrice(cartItem.item),
            notes: cartItem.notes || null,
            complements: cartItem.complements.map(c => ({
              name: c.item.name,
              quantity: c.quantity,
              price: getItemPrice(c.item),
            })),
          };
          
          if (productId) {
            itemData.product_id = productId;
          }
          
          if (cartItem.selectedVariation) {
            itemData.selectedVariation = {
              name: cartItem.selectedVariation.name,
              price: cartItem.selectedVariation.price,
            };
          }
          
          return itemData;
        }) as Json,
        subtotal: cartTotal,
        total: finalTotal,
        discount: 0,
        delivery_fee: 0,
        payment_method: null,
        status: "preparing",
        order_source: "waiter",
        table_id: table.id,
        paid: false,
      };
      
      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success(`Pedido #${order.order_number} enviado para cozinha - Mesa ${table.number}`);
      handleClearCart();
      
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar pedido");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCart = useCallback(() => {
    clearCart();
    setSelectedTable(null);
    setIsCounter(true);
    if (waiterName) {
      setCustomerName(`Garçom: ${waiterName}`);
    } else {
      setCustomerName("Cliente");
    }
  }, [clearCart, setCustomerName, waiterName]);

  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    
    const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    if (splitPayments.length === 0 || totalPaid < finalTotal) {
      toast.error("Pagamento incompleto");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const paymentMethodStr = splitPayments.length === 1 
        ? splitPayments[0].methodName 
        : splitPayments.map(p => `${p.methodName}: ${formatCurrency(p.amount)}`).join(" | ");
      
      const orderData = {
        store_id: store.id,
        customer_name: customerName || `Balcão - ${waiterName}`,
        customer_phone: "00000000000",
        order_type: "counter",
        staff_id: staffId,
        items: cart.map(cartItem => {
          let productId: string | undefined = undefined;
          const itemId = cartItem.item.id;
          
          if (itemId.startsWith('prod-')) {
            productId = itemId.substring(5);
          } else if (itemId.startsWith('inv-')) {
            productId = itemId.substring(4);
          }
          
          const itemData: Record<string, unknown> = {
            id: itemId,
            name: cartItem.item.name,
            quantity: cartItem.quantity,
            price: getItemPrice(cartItem.item),
            notes: cartItem.notes || null,
            complements: cartItem.complements.map(c => ({
              name: c.item.name,
              quantity: c.quantity,
              price: getItemPrice(c.item),
            })),
          };
          
          if (productId) {
            itemData.product_id = productId;
          }
          
          if (cartItem.selectedVariation) {
            itemData.selectedVariation = {
              name: cartItem.selectedVariation.name,
              price: cartItem.selectedVariation.price,
            };
          }
          
          return itemData;
        }) as Json,
        subtotal: cartTotal,
        total: finalTotal,
        discount: 0,
        delivery_fee: 0,
        payment_method: paymentMethodStr,
        payment_change: totalPaid > finalTotal ? totalPaid - finalTotal : null,
        status: "completed",
        paid: true,
        order_source: "waiter",
      };
      
      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success(`Pedido #${order.order_number} finalizado com sucesso!`);
      setIsPaymentOpen(false);
      handleClearCart();
      
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar pedido");
    } finally {
      setIsSaving(false);
    }
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando cardápio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex flex-col p-4">
      {/* Products Panel - Full width */}
      <PDVProductsPanel
        allDisplayItems={allDisplayItems}
        allDisplayCategories={allDisplayCategories}
        getSecondaryGroups={getSecondaryGroups}
        onProductClick={openComplementsModal}
      />

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-24 md:bottom-8 right-4 z-50">
          <Button
            size="lg"
            className="rounded-full h-16 w-16 shadow-xl relative"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="w-6 h-6" />
            <Badge className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center text-xs">
              {cartItemsCount}
            </Badge>
          </Button>
        </div>
      )}

      {/* Cart Sheet/Drawer */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Pedido Atual
              </SheetTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="icon" onClick={handleClearCart}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </SheetHeader>
          
          {/* Cart Items */}
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Carrinho vazio</p>
                <p className="text-xs mt-1">Clique nos produtos para adicionar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(cartItem => {
                  const itemTotal = getCartItemTotal(cartItem);
                  return (
                    <div key={cartItem.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
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
                          <p className="text-sm text-primary font-semibold mt-1">
                            {formatCurrency(itemTotal)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(cartItem.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(cartItem.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFromCart(cartItem.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Notes field */}
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3 h-3 text-muted-foreground mt-2 flex-shrink-0" />
                        <Input
                          placeholder="Observação do item..."
                          value={cartItem.notes || ""}
                          onChange={(e) => updateItemNotes(cartItem.id, e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          
          {/* Cart Footer */}
          <SheetFooter className="p-4 border-t flex-col gap-3">
            <div className="flex items-center justify-between w-full text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(finalTotal)}</span>
            </div>
            
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={cart.length === 0}
              onClick={handleFinishOrder}
            >
              <ShoppingCart className="w-4 h-4" />
              Enviar Pedido
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Table Selection Modal */}
      <PDVTableSelectionModal
        isOpen={isTableSelectionOpen}
        onClose={() => setIsTableSelectionOpen(false)}
        tables={tables}
        onSelectTable={handleTableSelected}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
      />

      {/* Complements Modal */}
      <Dialog open={isComplementsOpen} onOpenChange={setIsComplementsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionais - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {getSecondaryGroups(selectedProduct.category_id || "").map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm">{group.name}</h4>
                    {group.is_required && (
                      <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>
                    )}
                    {group.max_selections && (
                      <Badge variant="secondary" className="text-[10px]">
                        Máx: {group.max_selections}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {getGroupItems(group.id).map(item => {
                      const qty = selectedComplements.get(item.id) || 0;
                      const price = getItemPrice(item);
                      
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{item.name}</span>
                            {price > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +{formatCurrency(price)}
                              </span>
                            )}
                          </div>
                          
                          {group.selection_type === "single" ? (
                            <Button
                              size="sm"
                              variant={qty > 0 ? "default" : "outline"}
                              onClick={() => toggleComplement(item, group)}
                            >
                              {qty > 0 ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => addComplementQuantity(item, group, -1)}
                                disabled={qty === 0}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{qty}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => addComplementQuantity(item, group, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 text-left">
              {complementsTotal > 0 && (
                <span className="text-sm text-muted-foreground">
                  Adicionais: +{formatCurrency(complementsTotal)}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsComplementsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAddToCart}>
              Adicionar ao carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variations Modal */}
      <Dialog open={isVariationsOpen} onOpenChange={setIsVariationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Selecione o tamanho - {productForVariation?.name}
            </DialogTitle>
          </DialogHeader>
          
          {productForVariation?.variations && (
            <div className="space-y-2">
              {productForVariation.variations.map((variation, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => {
                    addToCartWithVariation(productForVariation, variation);
                    setIsVariationsOpen(false);
                  }}
                >
                  <span className="font-medium">{variation.name}</span>
                  <span className="text-primary font-bold">
                    {formatCurrency(variation.price)}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal - For counter orders */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamento - Balcão</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm text-muted-foreground">Total do Pedido</Label>
              <p className="text-2xl font-bold">{formatCurrency(finalTotal)}</p>
            </div>
            
            <PDVPaymentSection
              paymentMethods={paymentMethods}
              totalAmount={finalTotal}
              payments={splitPayments}
              onPaymentsChange={setSplitPayments}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveOrder} 
              disabled={isSaving || splitPayments.reduce((sum, p) => sum + p.amount, 0) < finalTotal}
            >
              {isSaving ? "Salvando..." : "Finalizar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
