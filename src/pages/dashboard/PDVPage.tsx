import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Plus, Minus, Check, X, Tag, Printer, DoorOpen
} from "lucide-react";
import { PDVLoyaltyRedemption } from "@/components/pdv/PDVLoyaltyRedemption";
import { PDVPaymentSection } from "@/components/pdv/PDVPaymentSection";
import { PDVManualDiscount } from "@/components/pdv/PDVManualDiscount";
import { PDVTablesPanel } from "@/components/pdv/PDVTablesPanel";
import { PDVProductsPanel } from "@/components/pdv/PDVProductsPanel";
import { PDVCartPanel } from "@/components/pdv/PDVCartPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { ComandaData, TableBillData, PrinterWidth } from "@/lib/thermalPrinter";
import { 
  printComanda, 
  printTableBill, 
  showPrintResultToast,
  isUSBPrintingSupported,
  isUSBPrinterConnected
} from "@/services/PrintService";
import { usePDVData, Table, getItemPrice, formatOccupationTime } from "@/hooks/usePDVData";
import { usePDVCart } from "@/hooks/usePDVCart";

export default function PDVPage() {
  const { store } = useOutletContext<{ store: any }>();
  
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
    releaseTableAfterOrder,
    setReleaseTableAfterOrder,
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

  // PDV State
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isCounter, setIsCounter] = useState(false);
  
  // Payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Table release confirmation
  const [tableToRelease, setTableToRelease] = useState<Table | null>(null);
  const [pendingOrdersForRelease, setPendingOrdersForRelease] = useState<any[]>([]);
  
  // Timer ticker for occupation time (updates every minute)
  useEffect(() => {
    const interval = setInterval(() => {}, 60000);
    return () => clearInterval(interval);
  }, []);

  const selectTable = async (table: Table) => {
    setSelectedTable(table);
    setIsCounter(false);
    setCustomerName(`Mesa ${table.number}`);
    
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

  const selectCounter = () => {
    setSelectedTable(null);
    setIsCounter(true);
    setCustomerName("Cliente Balcão");
  };

  const handleClearCart = useCallback(() => {
    clearCart();
    setSelectedTable(null);
    setIsCounter(false);
  }, [clearCart]);

  const requestReleaseTable = async (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: pendingOrders } = await supabase
      .from("orders")
      .select("id, order_number, total, status, items, created_at")
      .eq("store_id", store.id)
      .eq("table_id", table.id)
      .in("status", ["pending", "preparing", "ready"])
      .order("created_at", { ascending: false });
    
    setPendingOrdersForRelease(pendingOrders || []);
    setTableToRelease(table);
  };

  const confirmReleaseTable = async (orderAction?: "cancel" | "complete") => {
    if (!tableToRelease) return;
    
    try {
      if (orderAction && pendingOrdersForRelease.length > 0) {
        const newStatus = orderAction === "cancel" ? "cancelled" : "completed";
        const orderIds = pendingOrdersForRelease.map(o => o.id);
        
        await supabase
          .from("orders")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .in("id", orderIds);
        
        const actionLabel = orderAction === "cancel" ? "cancelados" : "finalizados";
        toast.success(`${pendingOrdersForRelease.length} pedido(s) ${actionLabel}`);
      }
      
      await supabase
        .from("tables")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", tableToRelease.id);
        
      setTables(prev => prev.map(t => 
        t.id === tableToRelease.id ? { ...t, status: "available", updated_at: new Date().toISOString() } : t
      ));
      
      if (selectedTable?.id === tableToRelease.id) {
        setSelectedTable(null);
        setCustomerName("Cliente Balcão");
      }
      
      toast.success(`Mesa ${tableToRelease.number} liberada!`);
    } catch {
      toast.error("Erro ao liberar mesa");
    } finally {
      setTableToRelease(null);
      setPendingOrdersForRelease([]);
    }
  };

  const printConsolidatedBill = async () => {
    if (!tableToRelease || pendingOrdersForRelease.length === 0) return;
    
    const printerWidth = (store?.printer_width as PrinterWidth) || '80mm';
    
    if (printerWidth !== 'a4' && !store?.printnode_printer_id && !isUSBPrintingSupported()) {
      toast.error("Impressão USB não disponível. Configure PrintNode ou use impressão A4.");
      return;
    }
    
    if (printerWidth !== 'a4' && !store?.printnode_printer_id && !isUSBPrinterConnected()) {
      toast.error("Impressora USB não conectada");
      return;
    }
    
    const occupationTime = tableToRelease.updated_at 
      ? formatOccupationTime(tableToRelease.updated_at)
      : "N/A";
    
    const consolidatedItems: TableBillData["items"] = [];
    
    pendingOrdersForRelease.forEach(order => {
      const items = order.items as any[];
      items.forEach((item: any) => {
        const existingItem = consolidatedItems.find(i => i.nome === item.name);
        if (existingItem) {
          existingItem.qty += item.quantity;
          existingItem.total += item.price * item.quantity;
        } else {
          consolidatedItems.push({
            qty: item.quantity,
            nome: item.name,
            preco_unitario: item.price,
            total: item.price * item.quantity,
          });
        }
        
        if (item.complements && Array.isArray(item.complements)) {
          item.complements.forEach((comp: any) => {
            const compName = `  + ${comp.name}`;
            const existingComp = consolidatedItems.find(i => i.nome === compName);
            if (existingComp) {
              existingComp.qty += comp.quantity * item.quantity;
              existingComp.total += comp.price * comp.quantity * item.quantity;
            } else {
              consolidatedItems.push({
                qty: comp.quantity * item.quantity,
                nome: compName,
                preco_unitario: comp.price,
                total: comp.price * comp.quantity * item.quantity,
              });
            }
          });
        }
      });
    });
    
    const total = pendingOrdersForRelease.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const billData: TableBillData = {
      mesa: tableToRelease.number,
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      tempo_permanencia: occupationTime,
      items: consolidatedItems,
      subtotal: total,
      total: total,
      pagamentos: [{ metodo: "A receber", valor: total }],
    };
    
    const result = await printTableBill(billData, {
      printerWidth,
      printNodePrinterId: store?.printnode_printer_id,
      storeId: store?.id,
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
    
    if (result.success) {
      toast.success("Comanda consolidada impressa!");
    } else {
      toast.error(result.error || "Erro ao imprimir comanda");
    }
  };

  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    
    if (!selectedTable && !isCounter) {
      toast.error("Selecione uma mesa ou balcão");
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
        table_id: selectedTable?.id || null,
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
        mesa: selectedTable?.number,
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
      
      // Release table if option is selected
      if (selectedTable && releaseTableAfterOrder) {
        await supabase
          .from("tables")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .eq("id", selectedTable.id);
          
        setTables(prev => prev.map(t => 
          t.id === selectedTable.id ? { ...t, status: "available" } : t
        ));
      }
      
      toast.success(`Pedido #${order.order_number} criado!`);
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
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Left Panel - Tables */}
      <PDVTablesPanel
        tables={tables}
        selectedTable={selectedTable}
        isCounter={isCounter}
        onSelectTable={selectTable}
        onSelectCounter={selectCounter}
        onRequestReleaseTable={requestReleaseTable}
      />

      {/* Center Panel - Products */}
      <PDVProductsPanel
        allDisplayItems={allDisplayItems}
        allDisplayCategories={allDisplayCategories}
        getSecondaryGroups={getSecondaryGroups}
        onProductClick={openComplementsModal}
      />

      {/* Right Panel - Cart */}
      <PDVCartPanel
        storeId={store?.id}
        selectedTable={selectedTable}
        isCounter={isCounter}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
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
        onOpenPayment={() => setIsPaymentOpen(true)}
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

      {/* Payment Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Local</Label>
              <p className="text-sm text-muted-foreground">
                {selectedTable ? `Mesa ${selectedTable.number}` : "Balcão"} - {customerName}
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
            
            {/* Release table option */}
            {selectedTable && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Checkbox 
                  id="release-table" 
                  checked={releaseTableAfterOrder}
                  onCheckedChange={(checked) => setReleaseTableAfterOrder(checked === true)}
                />
                <label 
                  htmlFor="release-table" 
                  className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                >
                  <DoorOpen className="w-4 h-4 text-muted-foreground" />
                  Liberar Mesa {selectedTable.number} após o pedido
                </label>
              </div>
            )}
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

      {/* Confirm Release Table Dialog */}
      <AlertDialog open={!!tableToRelease} onOpenChange={(open) => { if (!open) { setTableToRelease(null); setPendingOrdersForRelease([]); } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar Mesa {tableToRelease?.number}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {pendingOrdersForRelease.length > 0 ? (
                  <>
                    <p className="text-destructive font-medium">
                      ⚠️ Esta mesa possui {pendingOrdersForRelease.length} pedido(s) pendente(s):
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {pendingOrdersForRelease.map((order) => {
                        const items = order.items as any[];
                        const statusLabels: Record<string, string> = {
                          pending: "Pendente",
                          preparing: "Preparando",
                          ready: "Pronto",
                        };
                        return (
                          <div 
                            key={order.id} 
                            className="bg-muted/50 border rounded-md p-2 text-xs"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono font-bold">#{order.order_number}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground space-y-0.5">
                              {items.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="truncate">
                                  {item.quantity}x {item.name}
                                </div>
                              ))}
                              {items.length > 3 && (
                                <div className="text-muted-foreground/70">
                                  +{items.length - 3} item(s)...
                                </div>
                              )}
                            </div>
                            <div className="text-right font-medium mt-1">
                              {formatCurrency(order.total)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mt-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">Total pendente:</span>
                        <span className="font-bold text-lg text-primary">
                          {formatCurrency(pendingOrdersForRelease.reduce((sum, o) => sum + (o.total || 0), 0))}
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={printConsolidatedBill}
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Imprimir Comanda Consolidada
                      </Button>
                    </div>
                  </>
                ) : (
                  <p>Esta mesa não possui pedidos pendentes. Deseja liberar?</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            {pendingOrdersForRelease.length > 0 ? (
              <>
                <Button 
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => confirmReleaseTable("cancel")}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar Pedidos e Liberar
                </Button>
                <Button 
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-600/10"
                  onClick={() => confirmReleaseTable("complete")}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Fechar Pedidos e Liberar
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => confirmReleaseTable()}
                >
                  Apenas Liberar Mesa
                </Button>
              </>
            ) : (
              <AlertDialogAction onClick={() => confirmReleaseTable()}>
                Liberar Mesa
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
