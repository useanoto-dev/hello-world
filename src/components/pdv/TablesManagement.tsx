import { useEffect, useState, useCallback } from "react";
import { 
  Plus, Users, Clock, CreditCard, ChefHat, 
  MoreHorizontal, Trash2, Edit2, CheckCircle,
  Sparkles, Coffee, Receipt, Printer, Timer,
  CalendarDays, MoveRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDVPaymentSection, SplitPayment } from "./PDVPaymentSection";
import { PDVLoyaltyRedemption, AppliedReward } from "./PDVLoyaltyRedemption";
import { PDVManualDiscount, ManualDiscount } from "./PDVManualDiscount";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { format, differenceInMinutes } from "date-fns";
import { generateTableBillReceipt, getPrinter } from "@/lib/thermalPrinter";
import ReservationsTab from "@/components/admin/tables/ReservationsTab";
import TransferOrdersModal from "@/components/admin/tables/TransferOrdersModal";

interface Table {
  id: string;
  store_id: string;
  number: string;
  name: string | null;
  capacity: number;
  status: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface TableOrder {
  id: string;
  order_number: number;
  customer_name: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
  paid: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon_type: string;
}

interface TablesManagementProps {
  store: any;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "Livre", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  occupied: { label: "Ocupada", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
  reserved: { label: "Reservada", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30" },
  cleaning: { label: "Limpeza", color: "text-gray-600", bg: "bg-gray-500/10 border-gray-500/30" },
};

function useOccupancyTimer(tables: Table[], tableOrders: Record<string, TableOrder[]>) {
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);
  
  const getOccupancyTime = useCallback((tableId: string) => {
    const orders = tableOrders[tableId];
    if (!orders || orders.length === 0) return null;
    
    const earliest = orders.reduce((min, order) => {
      const orderDate = new Date(order.created_at);
      return orderDate < min ? orderDate : min;
    }, new Date(orders[0].created_at));
    
    const minutes = differenceInMinutes(new Date(), earliest);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  }, [tableOrders]);
  
  return { getOccupancyTime };
}

export default function TablesManagement({ store }: TablesManagementProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableOrders, setTableOrders] = useState<Record<string, TableOrder[]>>({});
  const [counterOrders, setCounterOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({ number: "", name: "", capacity: 4 });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutTable, setCheckoutTable] = useState<Table | null>(null);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Loyalty and discount states for checkout
  const [appliedReward, setAppliedReward] = useState<AppliedReward | null>(null);
  const [cpfForPoints, setCpfForPoints] = useState<string | null>(null);
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null);
  
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferSourceTable, setTransferSourceTable] = useState<Table | null>(null);
  
  const { getOccupancyTime } = useOccupancyTimer(tables, tableOrders);

  const openTransferModal = (table: Table) => {
    setTransferSourceTable(table);
    setSelectedTable(null);
    setIsTransferOpen(true);
  };

  const loadTables = useCallback(async () => {
    if (!store?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
        
      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error("Error loading tables:", error);
      toast.error("Erro ao carregar mesas");
    }
  }, [store?.id]);

  const loadOrders = useCallback(async () => {
    if (!store?.id) return;
    
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .eq("order_source", "pdv")
        .not("status", "in", '("completed","canceled")')
        .order("created_at", { ascending: true });
        
      if (error) throw error;
      
      const grouped: Record<string, TableOrder[]> = {};
      const counter: TableOrder[] = [];
      
      (ordersData || []).forEach(order => {
        const mapped: TableOrder = {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          items: (order.items as unknown as OrderItem[]) || [],
          total: order.total,
          status: order.status || "pending",
          created_at: order.created_at || "",
          paid: order.paid || false,
        };
        
        if (order.table_id) {
          if (!grouped[order.table_id]) grouped[order.table_id] = [];
          grouped[order.table_id].push(mapped);
        } else {
          counter.push(mapped);
        }
      });
      
      setTableOrders(grouped);
      setCounterOrders(counter);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  const loadPaymentMethods = useCallback(async () => {
    if (!store?.id) return;
    const { data } = await supabase
      .from("payment_methods")
      .select("id, name, icon_type")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("display_order");
    setPaymentMethods(data || []);
  }, [store?.id]);

  useEffect(() => {
    if (store?.id) {
      loadTables();
      loadOrders();
      loadPaymentMethods();
      
      const tablesChannel = supabase
        .channel("tables-realtime-management")
        .on("postgres_changes", { event: "*", schema: "public", table: "tables", filter: `store_id=eq.${store.id}` }, () => {
          loadTables();
        })
        .subscribe();
        
      const ordersChannel = supabase
        .channel("pdv-orders-realtime-management")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${store.id}` }, () => {
          loadOrders();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(tablesChannel);
        supabase.removeChannel(ordersChannel);
      };
    }
  }, [store?.id, loadTables, loadOrders, loadPaymentMethods]);

  const handleCreateTable = async () => {
    if (!formData.number.trim()) {
      toast.error("Número da mesa é obrigatório");
      return;
    }
    
    try {
      const { error } = await supabase.from("tables").insert({
        store_id: store.id,
        number: formData.number,
        name: formData.name || null,
        capacity: formData.capacity,
        display_order: tables.length,
      });
      
      if (error) throw error;
      
      toast.success("Mesa criada com sucesso!");
      setIsCreateOpen(false);
      setFormData({ number: "", name: "", capacity: 4 });
      loadTables();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar mesa");
    }
  };

  const handleUpdateTable = async () => {
    if (!editingTable) return;
    
    try {
      const { error } = await supabase
        .from("tables")
        .update({
          number: formData.number,
          name: formData.name || null,
          capacity: formData.capacity,
        })
        .eq("id", editingTable.id);
        
      if (error) throw error;
      
      toast.success("Mesa atualizada!");
      setEditingTable(null);
      loadTables();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar mesa");
    }
  };

  const handleDeleteTable = async (table: Table) => {
    try {
      const { error } = await supabase
        .from("tables")
        .update({ is_active: false })
        .eq("id", table.id);
        
      if (error) throw error;
      
      toast.success("Mesa removida");
      loadTables();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover mesa");
    }
  };

  const handleUpdateTableStatus = async (tableId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tables")
        .update({ status: newStatus })
        .eq("id", tableId);
        
      if (error) throw error;
      
      toast.success(`Status atualizado para ${statusConfig[newStatus]?.label}`);
      loadTables();
      setSelectedTable(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const getTableTotal = (tableId: string) => {
    const orders = tableOrders[tableId] || [];
    return orders.reduce((sum, order) => sum + order.total, 0);
  };

  const getTableOrderCount = (tableId: string) => {
    return (tableOrders[tableId] || []).length;
  };

  const openEditDialog = (table: Table) => {
    setFormData({ number: table.number, name: table.name || "", capacity: table.capacity });
    setEditingTable(table);
  };

  const openCheckout = (table: Table) => {
    setCheckoutTable(table);
    setSelectedTable(null);
    setSplitPayments([]);
    setAppliedReward(null);
    setCpfForPoints(null);
    setManualDiscount(null);
    setIsCheckoutOpen(true);
  };

  const getCheckoutSubtotal = () => {
    if (!checkoutTable) return 0;
    return getTableTotal(checkoutTable.id);
  };

  // Calculate loyalty discount
  const loyaltyDiscount = appliedReward?.discountAmount || 0;
  
  // Calculate manual discount amount
  const manualDiscountAmount = manualDiscount?.discountAmount || 0;

  const getCheckoutTotal = () => {
    const subtotal = getCheckoutSubtotal();
    return Math.max(0, subtotal - loyaltyDiscount - manualDiscountAmount);
  };

  const handlePaymentsChange = (newPayments: SplitPayment[]) => {
    setSplitPayments(newPayments);
  };

  const getTotalPaid = () => {
    return splitPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  const getChange = () => {
    const total = getCheckoutTotal();
    const paid = getTotalPaid();
    return paid > total ? paid - total : 0;
  };

  const handleCloseAccount = async (shouldPrint: boolean = false) => {
    if (!checkoutTable) return;
    
    const totalPaid = getTotalPaid();
    const total = getCheckoutTotal();
    const changeAmount = getChange();
    
    if (totalPaid < total - 0.01) {
      toast.error("O valor pago não cobre o total da conta");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const orders = tableOrders[checkoutTable.id] || [];
      
      for (const order of orders) {
        await supabase
          .from("orders")
          .update({ 
            status: "completed", 
            paid: true,
            notes: `Pagamento: ${splitPayments.map(p => `${p.methodName}: ${formatCurrency(p.amount)}`).join(", ")}${changeAmount > 0 ? ` | Troco: ${formatCurrency(changeAmount)}` : ''}`
          })
          .eq("id", order.id);
      }
      
      await supabase
        .from("tables")
        .update({ status: "available" })
        .eq("id", checkoutTable.id);
      
      if (shouldPrint) {
        await printConsolidatedBill(changeAmount);
      }
      
      toast.success(`Conta da Mesa ${checkoutTable.number} fechada com sucesso!${changeAmount > 0 ? ` Troco: ${formatCurrency(changeAmount)}` : ''}`);
      setIsCheckoutOpen(false);
      setCheckoutTable(null);
      setSplitPayments([]);
      loadOrders();
      loadTables();
    } catch (error: any) {
      toast.error(error.message || "Erro ao fechar conta");
    } finally {
      setIsProcessing(false);
    }
  };

  const printConsolidatedBill = async (changeAmount: number = 0) => {
    if (!checkoutTable) return;
    
    setIsPrinting(true);
    try {
      const orders = tableOrders[checkoutTable.id] || [];
      const occupancyTime = getOccupancyTime(checkoutTable.id) || "0min";
      
      const allItems: { qty: number; nome: string; preco_unitario: number; total: number }[] = [];
      orders.forEach(order => {
        order.items.forEach(item => {
          allItems.push({
            qty: item.quantity,
            nome: item.name,
            preco_unitario: item.price,
            total: item.quantity * item.price,
          });
        });
      });
      
      const billData = {
        mesa: checkoutTable.number,
        hora: format(new Date(), "dd/MM/yyyy HH:mm"),
        tempo_permanencia: occupancyTime,
        items: allItems,
        subtotal: getCheckoutTotal(),
        total: getCheckoutTotal(),
        pagamentos: splitPayments.map(p => ({
          metodo: p.methodName,
          valor: p.amount,
        })),
        troco: changeAmount > 0 ? changeAmount : undefined,
      };
      
      const printer = getPrinter();
      
      if (!printer.isConnected()) {
        const connected = await printer.connect();
        if (!connected) {
          toast.error("Não foi possível conectar à impressora");
          return;
        }
      }
      
      const receipt = generateTableBillReceipt(billData);
      const success = await printer.print(receipt);
      
      if (success) {
        toast.success("Conta impressa com sucesso!");
      } else {
        toast.error("Erro ao imprimir conta");
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Erro ao imprimir conta");
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando mesas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Gestão de Mesas</h2>
          <p className="text-[11px] text-muted-foreground">
            {tables.filter(t => t.status === "occupied").length} ocupadas de {tables.length}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-8 text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Nova Mesa
        </Button>
      </div>

      <Tabs defaultValue="tables" className="flex-1 flex flex-col">
        <TabsList className="h-8 bg-muted/50 w-fit">
          <TabsTrigger value="tables" className="text-xs h-7 gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Mesas ({tables.length})
          </TabsTrigger>
          <TabsTrigger value="reservations" className="text-xs h-7 gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Reservas
          </TabsTrigger>
          <TabsTrigger value="counter" className="text-xs h-7 gap-1.5">
            <Coffee className="w-3.5 h-3.5" />
            Balcão ({counterOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="flex-1 mt-4">
          {tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-30" />
              <p>Nenhuma mesa cadastrada</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira mesa
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {tables.map(table => {
                const config = statusConfig[table.status] || statusConfig.available;
                const total = getTableTotal(table.id);
                const orderCount = getTableOrderCount(table.id);
                
                return (
                  <Card
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`p-4 cursor-pointer hover:shadow-md transition-all border-2 ${config.bg}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-2xl font-bold">{table.number}</span>
                        {table.name && (
                          <p className="text-xs text-muted-foreground truncate">{table.name}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(table)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTable(table)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="mt-3 space-y-1">
                      <Badge variant="outline" className={`text-xs ${config.color}`}>
                        {config.label}
                      </Badge>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {table.capacity}
                      </div>
                      
                      {table.status === "occupied" && (
                        <>
                          {getOccupancyTime(table.id) && (
                            <div className="flex items-center gap-2 text-xs text-amber-600">
                              <Timer className="w-3 h-3" />
                              {getOccupancyTime(table.id)}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            <ChefHat className="w-3 h-3" />
                            {orderCount} pedido{orderCount !== 1 ? "s" : ""}
                          </div>
                          <div className="font-semibold text-sm text-primary">
                            {formatCurrency(total)}
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reservations" className="flex-1 mt-4">
          {store?.id && (
            <ReservationsTab
              storeId={store.id}
              tables={tables}
              onTableStatusChange={loadTables}
            />
          )}
        </TabsContent>

        <TabsContent value="counter" className="flex-1 mt-4">
          {counterOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Coffee className="w-12 h-12 mb-4 opacity-30" />
              <p>Nenhuma venda de balcão pendente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {counterOrders.map(order => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-primary">#{order.order_number}</span>
                    <Badge variant={order.paid ? "default" : "secondary"}>
                      {order.paid ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                  <div className="mt-2 text-xs space-y-1">
                    {order.items.slice(0, 3).map((item, i) => (
                      <div key={i}>{item.quantity}x {item.name}</div>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-muted-foreground">+{order.items.length - 3} mais</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "HH:mm")}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transfer Orders Modal */}
      {transferSourceTable && (
        <TransferOrdersModal
          isOpen={isTransferOpen}
          onClose={() => {
            setIsTransferOpen(false);
            setTransferSourceTable(null);
          }}
          sourceTable={transferSourceTable}
          tables={tables}
          orders={tableOrders[transferSourceTable.id] || []}
          onTransferComplete={() => {
            loadOrders();
            loadTables();
          }}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                placeholder="Ex: 01, A1, VIP"
                value={formData.number}
                onChange={e => setFormData(f => ({ ...f, number: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                placeholder="Ex: Varanda, Reservado"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="capacity">Capacidade</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={e => setFormData(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTable}>Criar Mesa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTable} onOpenChange={() => setEditingTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Mesa {editingTable?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-number">Número *</Label>
              <Input
                id="edit-number"
                value={formData.number}
                onChange={e => setFormData(f => ({ ...f, number: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Nome (opcional)</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-capacity">Capacidade</Label>
              <Input
                id="edit-capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={e => setFormData(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTable(null)}>Cancelar</Button>
            <Button onClick={handleUpdateTable}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Details Sheet */}
      <Sheet open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Mesa {selectedTable?.number}
              {selectedTable?.name && <span className="text-muted-foreground font-normal">({selectedTable.name})</span>}
            </SheetTitle>
          </SheetHeader>
          
          {selectedTable && (
            <div className="mt-6 space-y-6">
              {selectedTable.status === "occupied" && getOccupancyTime(selectedTable.id) && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <Timer className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo de permanência</p>
                    <p className="font-semibold text-amber-600">{getOccupancyTime(selectedTable.id)}</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Alterar Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={selectedTable.status === key ? "default" : "outline"}
                      size="sm"
                      className="justify-start"
                      onClick={() => handleUpdateTableStatus(selectedTable.id, key)}
                    >
                      {key === "available" && <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />}
                      {key === "occupied" && <Users className="w-4 h-4 mr-2 text-amber-500" />}
                      {key === "reserved" && <Clock className="w-4 h-4 mr-2 text-blue-500" />}
                      {key === "cleaning" && <Sparkles className="w-4 h-4 mr-2 text-gray-500" />}
                      {config.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Pedidos da Mesa</Label>
                {(tableOrders[selectedTable.id] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pedido aberto</p>
                ) : (
                  <div className="space-y-2">
                    {(tableOrders[selectedTable.id] || []).map(order => (
                      <Card key={order.id} className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">#{order.order_number}</span>
                          <span className="text-sm font-semibold">{formatCurrency(order.total)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.items.map((item, i) => (
                            <span key={i}>{item.quantity}x {item.name}{i < order.items.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                      </Card>
                    ))}
                    
                    <div className="pt-3 border-t flex items-center justify-between">
                      <span className="font-medium">Total da Mesa</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(getTableTotal(selectedTable.id))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {selectedTable.status === "occupied" && (tableOrders[selectedTable.id] || []).length > 0 && (
                  <>
                    <Button className="w-full gap-2" onClick={() => openCheckout(selectedTable)}>
                      <CreditCard className="w-4 h-4" />
                      Fechar Conta
                    </Button>
                    <Button variant="outline" className="w-full gap-2" onClick={() => openTransferModal(selectedTable)}>
                      <MoveRight className="w-4 h-4" />
                      Transferir Pedidos
                    </Button>
                  </>
                )}
                <Button variant="ghost" className="w-full" onClick={() => setSelectedTable(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamento - Mesa {checkoutTable?.number}</DialogTitle>
          </DialogHeader>

          {checkoutTable && (
            <div className="space-y-4">
              {/* Items/Orders */}
              <div>
                <Label>Itens</Label>
                <div className="mt-1 text-sm space-y-1 max-h-32 overflow-y-auto">
                  {(tableOrders[checkoutTable.id] || []).map(order => (
                    <div key={order.id}>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{formatCurrency(item.quantity * (item.price || 0))}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Loyalty Redemption */}
              <PDVLoyaltyRedemption
                storeId={store.id}
                subtotal={getCheckoutSubtotal()}
                onRewardApplied={setAppliedReward}
                appliedReward={appliedReward}
                onCpfForPoints={setCpfForPoints}
                cpfForPoints={cpfForPoints}
              />

              {/* Manual Discount */}
              <PDVManualDiscount
                subtotal={getCheckoutSubtotal() - loyaltyDiscount}
                discount={manualDiscount}
                onDiscountChange={setManualDiscount}
              />

              {/* Totals */}
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(getCheckoutSubtotal())}</span>
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
                  <span className="text-primary">{formatCurrency(getCheckoutTotal())}</span>
                </div>
              </div>

              {/* Payment Section */}
              <PDVPaymentSection
                paymentMethods={paymentMethods}
                totalAmount={getCheckoutTotal()}
                payments={splitPayments}
                onPaymentsChange={handlePaymentsChange}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => handleCloseAccount(false)}
              disabled={isProcessing || splitPayments.length === 0 || getTotalPaid() < getCheckoutTotal() - 0.01}
            >
              {isProcessing ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
