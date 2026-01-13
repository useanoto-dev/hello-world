import { useState } from "react";
import { ArrowRight, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface Table {
  id: string;
  number: string;
  name: string | null;
  status: string;
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
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: Table;
  tables: Table[];
  orders: TableOrder[];
  onTransferComplete: () => void;
}

export default function TransferOrdersModal({
  isOpen,
  onClose,
  sourceTable,
  tables,
  orders,
  onTransferComplete,
}: Props) {
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter out source table and occupied/cleaning tables
  const availableTables = tables.filter(
    t => t.id !== sourceTable.id && (t.status === "available" || t.status === "occupied")
  );

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const handleTransfer = async () => {
    if (!targetTableId) {
      toast.error("Selecione a mesa de destino");
      return;
    }

    if (selectedOrders.length === 0) {
      toast.error("Selecione pelo menos um pedido para transferir");
      return;
    }

    setIsProcessing(true);

    try {
      // Update orders to new table
      const { error } = await supabase
        .from("orders")
        .update({ table_id: targetTableId })
        .in("id", selectedOrders);

      if (error) throw error;

      // Update source table status if all orders transferred
      if (selectedOrders.length === orders.length) {
        await supabase
          .from("tables")
          .update({ status: "available" })
          .eq("id", sourceTable.id);
      }

      // Update target table status to occupied
      await supabase
        .from("tables")
        .update({ status: "occupied" })
        .eq("id", targetTableId);

      const targetTable = tables.find(t => t.id === targetTableId);
      toast.success(
        `${selectedOrders.length} pedido${selectedOrders.length > 1 ? "s" : ""} transferido${selectedOrders.length > 1 ? "s" : ""} para Mesa ${targetTable?.number}`
      );

      onTransferComplete();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao transferir pedidos");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setTargetTableId("");
    setSelectedOrders([]);
    onClose();
  };

  const selectedTotal = orders
    .filter(o => selectedOrders.includes(o.id))
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <MoveRight className="w-4 h-4" />
            Transferir Pedidos
          </DialogTitle>
          <DialogDescription>
            Mova pedidos da Mesa {sourceTable.number} para outra mesa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Target Table Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">Mesa de Destino *</Label>
            <Select value={targetTableId} onValueChange={setTargetTableId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione a mesa de destino" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map(table => (
                  <SelectItem key={table.id} value={table.id} className="text-xs">
                    Mesa {table.number} {table.name ? `(${table.name})` : ""} - {table.status === "occupied" ? "Ocupada" : "Livre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Visualization */}
          {targetTableId && (
            <div className="flex items-center justify-center gap-3 py-2.5 bg-muted/30 rounded-md">
              <div className="text-center">
                <span className="text-xl font-bold">{sourceTable.number}</span>
                <p className="text-[10px] text-muted-foreground">Origem</p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary" />
              <div className="text-center">
                <span className="text-xl font-bold">
                  {tables.find(t => t.id === targetTableId)?.number}
                </span>
                <p className="text-[10px] text-muted-foreground">Destino</p>
              </div>
            </div>
          )}

          {/* Orders Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Pedidos para transferir</Label>
              <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 text-[10px] px-2">
                {selectedOrders.length === orders.length ? "Desmarcar" : "Selecionar todos"}
              </Button>
            </div>
            <ScrollArea className="h-36 border rounded-md p-1.5">
              <div className="space-y-1.5">
                {orders.map(order => (
                  <Card
                    key={order.id}
                    className={`p-2 cursor-pointer transition-all ${
                      selectedOrders.includes(order.id) 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleOrder(order.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleOrder(order.id)}
                        className="h-3.5 w-3.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">#{order.order_number}</span>
                          <span className="font-semibold">{formatCurrency(order.total)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          {selectedOrders.length > 0 && (
            <div className="p-2 bg-primary/10 rounded-md flex items-center justify-between text-xs">
              <span>
                {selectedOrders.length} pedido{selectedOrders.length > 1 ? "s" : ""}
              </span>
              <span className="font-bold text-primary">{formatCurrency(selectedTotal)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleTransfer}
            disabled={isProcessing || !targetTableId || selectedOrders.length === 0}
            className="h-8 text-xs gap-1.5"
          >
            {isProcessing ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <MoveRight className="w-3.5 h-3.5" />
            )}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
