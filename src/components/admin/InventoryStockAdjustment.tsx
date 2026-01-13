import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventoryProduct {
  id: string;
  name: string;
  stock_quantity: number;
  unit: string;
}

interface InventoryStockAdjustmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: InventoryProduct;
  storeId: string;
  onAdjusted: () => void;
}

export default function InventoryStockAdjustment({
  open,
  onOpenChange,
  product,
  storeId,
  onAdjusted,
}: InventoryStockAdjustmentProps) {
  const [saving, setSaving] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const handleSave = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    if (!reason.trim()) {
      toast.error("Motivo é obrigatório");
      return;
    }

    const newStock = adjustmentType === "add" 
      ? product.stock_quantity + qty 
      : product.stock_quantity - qty;

    if (newStock < 0) {
      toast.error("Estoque não pode ficar negativo");
      return;
    }

    setSaving(true);
    try {
      // Update product stock
      const { error: updateError } = await supabase
        .from("inventory_products")
        .update({ stock_quantity: newStock })
        .eq("id", product.id);

      if (updateError) throw updateError;

      // Record movement
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          store_id: storeId,
          product_id: product.id,
          movement_type: adjustmentType === "add" ? "entrada" : "saida",
          quantity: qty,
          previous_stock: product.stock_quantity,
          new_stock: newStock,
          reason: reason.trim(),
          created_by: "admin",
        });

      if (movementError) throw movementError;

      toast.success("Estoque ajustado com sucesso!");
      onAdjusted();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast.error(error.message || "Erro ao ajustar estoque");
    } finally {
      setSaving(false);
    }
  };

  const previewStock = () => {
    const qty = parseInt(quantity) || 0;
    if (adjustmentType === "add") {
      return product.stock_quantity + qty;
    }
    return Math.max(0, product.stock_quantity - qty);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Estoque</DialogTitle>
          <DialogDescription>
            {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current stock */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">Estoque atual</span>
            </div>
            <span className="font-semibold">
              {product.stock_quantity} {product.unit}
            </span>
          </div>

          {/* Adjustment type */}
          <div className="space-y-2">
            <Label>Tipo de ajuste</Label>
            <RadioGroup 
              value={adjustmentType} 
              onValueChange={(v) => setAdjustmentType(v as "add" | "remove")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id="add" />
                <Label htmlFor="add" className="flex items-center gap-1 cursor-pointer">
                  <Plus className="w-4 h-4 text-green-500" />
                  Adicionar
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remove" id="remove" />
                <Label htmlFor="remove" className="flex items-center gap-1 cursor-pointer">
                  <Minus className="w-4 h-4 text-red-500" />
                  Remover
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade ({product.unit})</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Reposição de estoque, Produto danificado, etc."
              rows={2}
            />
          </div>

          {/* Preview */}
          {quantity && parseInt(quantity) > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm">Novo estoque</span>
              <span className="font-semibold text-primary">
                {previewStock()} {product.unit}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
