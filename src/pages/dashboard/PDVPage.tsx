import { useState, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Plus, Minus, Check, Tag, Monitor, Users, Keyboard
} from "lucide-react";
import { PDVLoyaltyRedemption } from "@/components/pdv/PDVLoyaltyRedemption";
import { PDVPaymentSection } from "@/components/pdv/PDVPaymentSection";
import { PDVManualDiscount } from "@/components/pdv/PDVManualDiscount";
import { PDVProductsPanel } from "@/components/pdv/PDVProductsPanel";
import { PDVNewCartPanel } from "@/components/pdv/PDVNewCartPanel";
import { PDVTableSelectionModal } from "@/components/pdv/PDVTableSelectionModal";
import TablesManagement from "@/components/pdv/TablesManagement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { ComandaData, PrinterWidth } from "@/lib/thermalPrinter";
import { 
  printComanda, 
  showPrintResultToast,
  isUSBPrintingSupported,
  isUSBPrinterConnected
} from "@/services/PrintService";
import { usePDVData, Table, getItemPrice } from "@/hooks/usePDVData";
import { usePDVCart } from "@/hooks/usePDVCart";
import { usePDVKeyboardShortcuts, PDVShortcutsHelp } from "@/hooks/usePDVKeyboardShortcuts";

interface PDVOutletContext {
  store: {
    id: string;
    name: string;
    slug: string;
    delivery_fee: number;
    min_order_value: number;
    printnode_api_key?: string;
    printnode_printer_id?: string;
    printnode_printer_width?: string;
    printer_width?: string;
    printnode_auto_print?: boolean;
    printnode_printer_name?: string;
    printnode_max_retries?: number;
    logo_url?: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    print_footer_message?: string;
  };
}

export default function PDVPage() {
  const { store } = useOutletContext<PDVOutletContext>();
  
  // State for active module tab
  const [activeModule, setActiveModule] = useState<string>("vendas");
  
  // Use extracted hooks
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
    appliedReward,
    setAppliedReward,
    cpfForPoints,
    setCpfForPoints,
    splitPayments,
    setSplitPayments,
    manualDiscount,
    setManualDiscount,
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
    manualDiscountAmount,
    loyaltyDiscount,
    totalDiscount,
    finalTotal,
    complementsTotal,
  } = usePDVCart(getSecondaryGroups, getGroupItems, allOptionItems);

  // Ref for search input focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Discount modal state
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);

  // NEW FLOW: Table selection happens AFTER order is built
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isCounter, setIsCounter] = useState(true); // Default to counter
  
  // Payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Keyboard shortcuts
  usePDVKeyboardShortcuts({
    onFinishOrder: () => {
      if (cart.length > 0 && activeModule === "vendas") {
        handleFinishOrder();
      }
    },
    onClearCart: () => {
      if (cart.length > 0 && activeModule === "vendas") {
        clearCart();
      }
    },
    onToggleDiscount: () => {
      if (activeModule === "vendas") {
        setIsDiscountOpen(prev => !prev);
      }
    },
    onSearchFocus: () => {
      searchInputRef.current?.focus();
    },
    onOpenTables: () => {
      setActiveModule("mesas");
    },
    enabled: activeModule === "vendas" || activeModule === "mesas",
  });

  const handleFinishOrder = () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    // Open table selection modal first
    setIsTableSelectionOpen(true);
  };

  const handleTableSelected = async (table: Table | null, isCounterOrder: boolean) => {
    if (table) {
      setSelectedTable(table);
      setIsCounter(false);
      if (customerName === "Cliente" || customerName === "Cliente Balcão") {
        setCustomerName(`Mesa ${table.number}`);
      }
      
      // Automatically occupy table if available
      if (table.status === "available") {
        await supabase
          .from("tables")
          .update({ status: "occupied", updated_at: new Date().toISOString() })
          .eq("id", table.id);
          
        setTables(prev => prev.map(t => 
          t.id === table.id ? { ...t, status: "occupied" } : t
        ));
      }
      
      // For table orders: send directly to kitchen (no payment now)
      await handleSendToKitchen(table);
    } else {
      setSelectedTable(null);
      setIsCounter(true);
      if (customerName.startsWith("Mesa ")) {
        setCustomerName("Cliente Balcão");
      }
      
      // For counter orders: open payment modal
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
        customer_name: customerName.startsWith("Mesa ") ? customerName : `Mesa ${table.number}`,
        customer_phone: "00000000000",
        order_type: "dine_in",
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
        discount: totalDiscount,
        delivery_fee: 0,
        payment_method: null, // No payment yet for table orders
        status: "preparing", // Goes to kitchen
        order_source: "pdv",
        table_id: table.id,
        paid: false, // Not paid yet
      };
      
      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Print comanda for kitchen
      const printerWidth = (store?.printer_width as PrinterWidth) || '80mm';
      
      const comandaData: ComandaData = {
        order_number: order.order_number,
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        cliente: `Mesa ${table.number}`,
        whatsapp: "",
        forma_pagamento: "A pagar",
        items: cart.flatMap(cartItem => [
          { qty: cartItem.quantity, nome: cartItem.item.name, observacao: cartItem.notes },
          ...cartItem.complements.map(c => ({
            qty: c.quantity,
            nome: `  + ${c.item.name}`,
          }))
        ]),
        total: finalTotal,
        taxa_entrega: 0,
        tipo_servico: 'dine_in',
        mesa: table.number,
      };
      
      const shouldPrint = store?.printnode_auto_print && store?.printnode_printer_id ||
                          (isUSBPrintingSupported() && isUSBPrinterConnected());
      
      if (shouldPrint) {
        const result = await printComanda(comandaData, {
          printerWidth,
          printNodePrinterId: store?.printnode_auto_print ? store?.printnode_printer_id : undefined,
          storeId: store?.id,
          orderId: order.id,
          orderNumber: order.order_number,
          printerName: store?.printnode_printer_name,
          maxRetries: store?.printnode_max_retries ?? 2,
          logoUrl: store?.logo_url,
          storeInfo: {
            nome: store?.name,
            endereco: store?.address,
            telefone: store?.phone,
            whatsapp: store?.whatsapp,
            mensagemPersonalizada: store?.print_footer_message,
          }
        });
        
        showPrintResultToast(result, order.order_number);
      }
      
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
    setCustomerName("Cliente");
  }, [clearCart, setCustomerName]);

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
        customer_name: customerName,
        customer_phone: cpfForPoints || "00000000000",
        order_type: "dine_in",
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
        discount: totalDiscount,
        delivery_fee: 0,
        payment_method: paymentMethodStr,
        status: "preparing",
        order_source: "pdv",
        table_id: null, // Counter orders have no table
        paid: true, // Counter orders are paid immediately
      };
      
      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Process loyalty reward redemption
      if (appliedReward) {
        const { data: currentPoints } = await supabase
          .from("customer_points")
          .select("total_points, id")
          .eq("store_id", store.id)
          .eq("customer_cpf", appliedReward.customerCpf)
          .single();
          
        if (currentPoints) {
          await supabase
            .from("customer_points")
            .update({ 
              total_points: Math.max(0, currentPoints.total_points - appliedReward.pointsUsed) 
            })
            .eq("id", currentPoints.id);
            
          await supabase
            .from("point_transactions")
            .insert({
              store_id: store.id,
              customer_cpf: appliedReward.customerCpf,
              customer_phone: "00000000000",
              points: -appliedReward.pointsUsed,
              type: "redemption",
              description: `Resgate: ${appliedReward.rewardName}`,
              order_id: order.id,
              reward_id: appliedReward.rewardId,
            });
        }
      }
      
      // Earn points if CPF was provided
      if (cpfForPoints) {
        const { data: loyaltySettings } = await supabase
          .from("loyalty_settings")
          .select("is_enabled, points_per_currency, min_order_for_points, tiers_enabled, tier_bronze_min, tier_silver_min, tier_gold_min, tier_bronze_bonus, tier_silver_bonus, tier_gold_bonus")
          .eq("store_id", store.id)
          .eq("is_enabled", true)
          .maybeSingle();
          
        if (loyaltySettings && finalTotal >= (loyaltySettings.min_order_for_points || 0)) {
          let basePoints = Math.floor(finalTotal * loyaltySettings.points_per_currency);
          
          const { data: existingPoints } = await supabase
            .from("customer_points")
            .select("id, total_points, lifetime_points, tier")
            .eq("store_id", store.id)
            .eq("customer_cpf", cpfForPoints)
            .maybeSingle();
            
          let tierBonus = 0;
          if (loyaltySettings.tiers_enabled && existingPoints) {
            if (existingPoints.tier === "gold") {
              tierBonus = Math.floor(basePoints * (loyaltySettings.tier_gold_bonus / 100));
            } else if (existingPoints.tier === "silver") {
              tierBonus = Math.floor(basePoints * (loyaltySettings.tier_silver_bonus / 100));
            } else if (existingPoints.tier === "bronze") {
              tierBonus = Math.floor(basePoints * (loyaltySettings.tier_bronze_bonus / 100));
            }
          }
          
          const totalPointsEarned = basePoints + tierBonus;
          
          if (existingPoints) {
            const newTotal = existingPoints.total_points + totalPointsEarned;
            const newLifetime = existingPoints.lifetime_points + totalPointsEarned;
            
            let newTier = "bronze";
            if (newLifetime >= loyaltySettings.tier_gold_min) newTier = "gold";
            else if (newLifetime >= loyaltySettings.tier_silver_min) newTier = "silver";
            
            await supabase
              .from("customer_points")
              .update({ 
                total_points: newTotal,
                lifetime_points: newLifetime,
                tier: newTier,
              })
              .eq("id", existingPoints.id);
          } else {
            await supabase
              .from("customer_points")
              .insert({
                store_id: store.id,
                customer_cpf: cpfForPoints,
                customer_phone: cpfForPoints,
                customer_name: customerName,
                total_points: totalPointsEarned,
                lifetime_points: totalPointsEarned,
                tier: "bronze",
              });
          }
          
          await supabase
            .from("point_transactions")
            .insert({
              store_id: store.id,
              customer_cpf: cpfForPoints,
              customer_phone: cpfForPoints,
              points: totalPointsEarned,
              type: "earn",
              description: `Pedido PDV #${order.order_number}`,
              order_id: order.id,
            });
            
          toast.success(`+${totalPointsEarned} pontos acumulados!`, { duration: 3000 });
        }
      }
      
      // Print comanda
      const printerWidth = (store?.printer_width as PrinterWidth) || '80mm';
      const printPaymentMethodStr = splitPayments.length === 1 
        ? splitPayments[0].methodName 
        : splitPayments.map(p => `${p.methodName}: ${formatCurrency(p.amount)}`).join(" | ");
        
      const comandaData: ComandaData = {
        order_number: order.order_number,
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        cliente: customerName,
        whatsapp: "",
        forma_pagamento: printPaymentMethodStr,
        items: cart.flatMap(cartItem => [
          { qty: cartItem.quantity, nome: cartItem.item.name, observacao: cartItem.notes },
          ...cartItem.complements.map(c => ({
            qty: c.quantity,
            nome: `  + ${c.item.name}`,
          }))
        ]),
        total: finalTotal,
        taxa_entrega: 0,
        tipo_servico: 'dine_in',
        mesa: undefined, // Counter order
      };
      
      const shouldPrint = store?.printnode_auto_print && store?.printnode_printer_id ||
                          (isUSBPrintingSupported() && isUSBPrinterConnected());
      
      if (shouldPrint) {
        const result = await printComanda(comandaData, {
          printerWidth,
          printNodePrinterId: store?.printnode_auto_print ? store?.printnode_printer_id : undefined,
          storeId: store?.id,
          orderId: order.id,
          orderNumber: order.order_number,
          printerName: store?.printnode_printer_name,
          maxRetries: store?.printnode_max_retries ?? 2,
          logoUrl: store?.logo_url,
          storeInfo: {
            nome: store?.name,
            endereco: store?.address,
            telefone: store?.phone,
            whatsapp: store?.whatsapp,
            mensagemPersonalizada: store?.print_footer_message,
          }
        });
        
        showPrintResultToast(result, order.order_number);
      }
      
      toast.success(`Pedido #${order.order_number} criado - Balcão`);
      setIsPaymentOpen(false);
      handleClearCart();
      
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar pedido");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando PDV...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Module Tabs */}
      <div className="border-b bg-background px-4 pt-2 flex items-center justify-between">
        <Tabs value={activeModule} onValueChange={setActiveModule} className="flex-1">
          <TabsList className="h-10 bg-muted/50">
            <TabsTrigger value="vendas" className="text-sm gap-2 px-6">
              <Monitor className="w-4 h-4" />
              Vendas
              <kbd className="hidden sm:inline-flex kbd-hint ml-1">F2</kbd>
            </TabsTrigger>
            <TabsTrigger value="mesas" className="text-sm gap-2 px-6">
              <Users className="w-4 h-4" />
              Mesas
              <kbd className="hidden sm:inline-flex kbd-hint ml-1">F6</kbd>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Keyboard shortcuts help */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hidden md:flex">
              <Keyboard className="w-4 h-4" />
              <span className="text-xs">Atalhos</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Atalhos de Teclado</h4>
              <PDVShortcutsHelp />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Content based on active module */}
      {activeModule === "vendas" ? (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Products Panel - Takes most space now (no tables panel on left) */}
          <PDVProductsPanel
            allDisplayItems={allDisplayItems}
            allDisplayCategories={allDisplayCategories}
            getSecondaryGroups={getSecondaryGroups}
            onProductClick={openComplementsModal}
          />

          {/* Cart Panel - New simplified version */}
          <PDVNewCartPanel
            cart={cart}
            getCartItemTotal={getCartItemTotal}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            updateItemNotes={updateItemNotes}
            clearCart={handleClearCart}
            manualDiscount={manualDiscount}
            manualDiscountAmount={manualDiscountAmount}
            appliedReward={appliedReward}
            loyaltyDiscount={loyaltyDiscount}
            finalTotal={finalTotal}
            onFinishOrder={handleFinishOrder}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <TablesManagement store={store} />
        </div>
      )}

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
                      <Badge variant="outline" className="text-[10px]">
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
                          onClick={() => group.selection_type === "single" && toggleComplement(item, group)}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                            qty > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          }`}
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
              
              {/* Total preview */}
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Produto</span>
                  <span>{formatCurrency(selectedProduct ? getItemPrice(selectedProduct) : 0)}</span>
                </div>
                {complementsTotal > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Adicionais</span>
                    <span>+{formatCurrency(complementsTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-2">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrency((selectedProduct ? getItemPrice(selectedProduct) : 0) + complementsTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComplementsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAddToCart} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar ao Pedido
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
              Selecione a Variação
            </DialogTitle>
          </DialogHeader>
          
          {productForVariation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {productForVariation.image_url && (
                  <img 
                    src={productForVariation.image_url} 
                    alt={productForVariation.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">{productForVariation.name}</p>
                  {productForVariation.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{productForVariation.description}</p>
                  )}
                </div>
              </div>
              
              <div className="grid gap-2">
                {productForVariation.variations?.map((variation) => (
                  <button
                    key={variation.name}
                    onClick={() => addToCartWithVariation(productForVariation, variation)}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <span className="font-medium">{variation.name}</span>
                    <span className="text-primary font-semibold">{formatCurrency(variation.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariationsOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal - Only for counter orders */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento - Balcão</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <p className="text-sm text-muted-foreground">
                {customerName}
              </p>
            </div>
            
            <div>
              <Label>Itens</Label>
              <div className="mt-1 text-sm space-y-1 max-h-32 overflow-y-auto">
                {cart.map(cartItem => (
                  <div key={cartItem.id}>
                    <div className="flex justify-between">
                      <span>
                        {cartItem.quantity}x {cartItem.item.name}
                        {cartItem.selectedVariation && ` (${cartItem.selectedVariation.name})`}
                      </span>
                      <span>{formatCurrency(getCartItemTotal(cartItem))}</span>
                    </div>
                    {cartItem.complements.length > 0 && (
                      <div className="pl-4 text-xs text-muted-foreground">
                        {cartItem.complements.map(c => (
                          <div key={c.item.id}>+ {c.quantity}x {c.item.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Loyalty Redemption */}
            <PDVLoyaltyRedemption
              storeId={store.id}
              subtotal={cartTotal}
              onRewardApplied={setAppliedReward}
              appliedReward={appliedReward}
              onCpfForPoints={setCpfForPoints}
              cpfForPoints={cpfForPoints}
            />
            
            {/* Manual Discount */}
            <PDVManualDiscount
              subtotal={cartTotal - loyaltyDiscount}
              discount={manualDiscount}
              onDiscountChange={setManualDiscount}
            />
            
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              {manualDiscount && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Desconto Manual</span>
                  <span>-{formatCurrency(manualDiscountAmount)}</span>
                </div>
              )}
              {appliedReward && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Desconto Fidelidade</span>
                  <span>-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            
            {/* Payment Section with Split & Change */}
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
              {isSaving ? "Salvando..." : "Confirmar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
