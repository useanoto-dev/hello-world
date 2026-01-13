import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, ShoppingCart, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InventoryProduct {
  id: string;
  name: string;
  unit: string;
}

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  order_id: string | null;
}

interface InventoryMovementHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: InventoryProduct;
}

export default function InventoryMovementHistory({
  open,
  onOpenChange,
  product,
}: InventoryMovementHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    if (open && product.id) {
      loadMovements();
    }
  }, [open, product.id]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error loading movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
      case "saida":
        return <ArrowDownCircle className="w-5 h-5 text-red-500" />;
      case "venda":
        return <ShoppingCart className="w-5 h-5 text-blue-500" />;
      case "ajuste":
        return <RefreshCw className="w-5 h-5 text-amber-500" />;
      default:
        return <Package className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "entrada":
        return { label: "Entrada", variant: "default" as const };
      case "saida":
        return { label: "Saída", variant: "destructive" as const };
      case "venda":
        return { label: "Venda", variant: "secondary" as const };
      case "ajuste":
        return { label: "Ajuste", variant: "outline" as const };
      default:
        return { label: type, variant: "secondary" as const };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de Movimentações</DialogTitle>
          <DialogDescription>
            {product.name} - Últimas 50 movimentações
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => {
                const { label, variant } = getMovementLabel(movement.movement_type);
                const isIncrease = movement.new_stock > movement.previous_stock;

                return (
                  <div key={movement.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="mt-1">
                      {getMovementIcon(movement.movement_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={variant}>{label}</Badge>
                        <span className={`text-sm font-medium ${isIncrease ? "text-green-600" : "text-red-600"}`}>
                          {isIncrease ? "+" : "-"}{movement.quantity} {product.unit}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {movement.previous_stock} → {movement.new_stock} {product.unit}
                      </p>
                      
                      {movement.reason && (
                        <p className="text-sm mt-1">{movement.reason}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(movement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {movement.created_by && (
                          <>
                            <span>•</span>
                            <span>por {movement.created_by}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
