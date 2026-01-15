import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Plus, Minus, Check, X, Send, ShoppingCart, UtensilsCrossed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { usePDVData, Table, getItemPrice, OptionItem } from "@/hooks/usePDVData";
import { usePDVCart } from "@/hooks/usePDVCart";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { cn } from "@/lib/utils";

export default function WaiterPOSPage() {
  const { store } = useOutletContext<{ store: any }>();
  const { staffId, name: waiterName, storeId } = useStaffAuth();
  
  const {
    tables,
    setTables,
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
    openComplementsModal,
    toggleComplement,
    addComplementQuantity,
    confirmAddToCart,
    updateQuantity,
    removeFromCart,
    updateItemNotes,
    clearCart,
    getCartItemTotal,
    cartTotal,
    finalTotal,
  } = usePDVCart(getSecondaryGroups, getGroupItems, allOptionItems);

  // Waiter POS State
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  // Auto-set customer name with waiter name
  useEffect(() => {
    if (waiterName) {
      setCustomerName(`Garçom: ${waiterName}`);
    }
  }, [waiterName, setCustomerName]);

  // Available tables only
  const availableTables = tables.filter(t => t.status === "occupied" || t.status === "available");

  const selectTable = async (table: Table) => {
    setSelectedTable(table);
    setIsTableSelectorOpen(false);
    
    if (table.status === "available") {
      await supabase
        .from("tables")
        .update({ status: "occupied", updated_at: new Date().toISOString() })
        .eq("id", table.id);
        
      setTables(prev => prev.map(t => 
        t.id === table.id ? { ...t, status: "occupied" } : t
      ));
    }
  };

  const handleClearCart = useCallback(() => {
    clearCart();
    setSelectedTable(null);
    setOrderNotes("");
  }, [clearCart]);

  // Filter products by category
  const filteredProducts = selectedCategory 
    ? allDisplayItems.filter(item => item.category_id === selectedCategory)
    : allDisplayItems;

  const handleSendOrder = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    
    if (!selectedTable) {
      toast.error("Selecione uma mesa");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const orderData = {
        store_id: store.id,
        customer_name: `Mesa ${selectedTable.number} - ${waiterName}`,
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
        status: "pending",
        order_source: "waiter",
        table_id: selectedTable.id,
        notes: orderNotes || null,
      };
      
      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success(`Pedido #${order.order_number} enviado para a cozinha!`);
      setIsCartOpen(false);
      handleClearCart();
      
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar pedido");
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant={selectedTable ? "default" : "outline"}
            onClick={() => setIsTableSelectorOpen(true)}
            className="gap-2"
          >
            <UtensilsCrossed className="w-4 h-4" />
            {selectedTable ? `Mesa ${selectedTable.number}` : "Selecionar Mesa"}
          </Button>
          
          {waiterName && (
            <Badge variant="secondary" className="hidden sm:flex">
              Garçom: {waiterName}
            </Badge>
          )}
        </div>
        
        <Button
          variant="default"
          onClick={() => setIsCartOpen(true)}
          className="gap-2 relative"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Carrinho</span>
          {cart.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-3 overflow-x-auto border-b bg-muted/30">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="shrink-0"
        >
          Todos
        </Button>
        {allDisplayCategories.map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="shrink-0"
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map(item => {
            const price = getItemPrice(item);
            const hasPromo = item.promotional_price !== null && price === item.promotional_price;
            
            return (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => openComplementsModal(item)}
              >
                {item.image_url && (
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {hasPromo && (
                      <Badge className="absolute top-2 right-2 bg-red-500">
                        Promo
                      </Badge>
                    )}
                  </div>
                )}
                <CardContent className={cn("p-3", !item.image_url && "pt-4")}>
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">
                      {formatCurrency(price)}
                    </span>
                    {hasPromo && item.additional_price > 0 && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(item.additional_price)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 right-4 md:hidden">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 shadow-lg"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="w-6 h-6" />
            <Badge className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          </Button>
        </div>
      )}

      {/* Table Selector Dialog */}
      <Dialog open={isTableSelectorOpen} onOpenChange={setIsTableSelectorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Mesa</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-3 gap-3 p-1">
              {availableTables.map(table => (
                <Button
                  key={table.id}
                  variant={table.status === "occupied" ? "secondary" : "outline"}
                  className={cn(
                    "h-16 flex flex-col gap-1",
                    selectedTable?.id === table.id && "ring-2 ring-primary"
                  )}
                  onClick={() => selectTable(table)}
                >
                  <span className="font-bold">{table.number}</span>
                  <span className="text-[10px] opacity-70">
                    {table.status === "occupied" ? "Ocupada" : "Livre"}
                  </span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
                  </div>
                  
                  <div className="space-y-2">
                    {getGroupItems(group.id).map(item => {
                      const qty = selectedComplements.get(item.id) || 0;
                      const price = getItemPrice(item);
                      
                      return (
                        <div
                          key={item.id}
                          onClick={() => group.selection_type === "single" && toggleComplement(item, group)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors",
                            qty > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {qty > 0 && group.selection_type === "single" && (
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-primary-foreground" />
                              </div>
                            )}
                            <span className="text-sm">{item.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-primary font-medium">
                              +{formatCurrency(price)}
                            </span>
                            
                            {group.selection_type === "multiple" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addComplementQuantity(item, group, -1);
                                  }}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-6 text-center text-sm">{qty}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addComplementQuantity(item, group, 1);
                                  }}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {getSecondaryGroups(selectedProduct.category_id || "").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem adicionais disponíveis
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComplementsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAddToCart}>
              Adicionar ao Carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart Sheet */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
              {selectedTable && (
                <Badge variant="secondary">Mesa {selectedTable.number}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                <p>Carrinho vazio</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {cart.map((cartItem) => (
                  <Card key={cartItem.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{cartItem.item.name}</h4>
                          {cartItem.complements.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {cartItem.complements.map(c => c.item.name).join(", ")}
                            </p>
                          )}
                          {cartItem.notes && (
                            <p className="text-xs text-amber-600 mt-1">Obs: {cartItem.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeFromCart(cartItem.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(cartItem.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center font-medium">{cartItem.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(cartItem.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="font-bold text-primary">
                          {formatCurrency(getCartItemTotal(cartItem))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {cart.length > 0 && (
            <>
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  placeholder="Observações do pedido (opcional)"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="min-h-[60px]"
                />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
              
              <SheetFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleClearCart}
                  className="flex-1"
                >
                  Limpar
                </Button>
                <Button
                  onClick={handleSendOrder}
                  disabled={isSaving || !selectedTable}
                  className="flex-1 gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Pedido
                    </>
                  )}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
