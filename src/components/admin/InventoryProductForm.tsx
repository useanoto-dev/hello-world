import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tag, Calendar, Infinity, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface InventoryProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  promotional_price: number | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
  stock_quantity: number;
  min_stock_alert: number;
  unit: string;
  is_active: boolean;
  category_id: string;
}

interface InventoryProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: InventoryProduct | null;
  categoryId: string;
  storeId: string;
  onSaved: () => void;
}

const UNITS = [
  { value: "un", label: "Unidade (un)" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "l", label: "Litro (l)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "cx", label: "Caixa (cx)" },
  { value: "pct", label: "Pacote (pct)" },
];

function formatDateForInput(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    // Format to datetime-local format: YYYY-MM-DDTHH:mm
    return date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default function InventoryProductForm({
  open,
  onOpenChange,
  product,
  categoryId,
  storeId,
  onSaved,
}: InventoryProductFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    image_url: null as string | null,
    price: "",
    promotional_price: "" as string,
    has_promotion: false,
    promotion_start_at: "",
    promotion_end_at: "",
    is_indefinite: true,
    stock_quantity: "",
    min_stock_alert: "5",
    unit: "un",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description || "",
        image_url: product.image_url,
        price: product.price.toString(),
        promotional_price: product.promotional_price?.toString() || "",
        has_promotion: product.promotional_price !== null,
        promotion_start_at: formatDateForInput(product.promotion_start_at),
        promotion_end_at: formatDateForInput(product.promotion_end_at),
        is_indefinite: product.promotion_end_at === null,
        stock_quantity: product.stock_quantity.toString(),
        min_stock_alert: product.min_stock_alert.toString(),
        unit: product.unit,
      });
    } else {
      setForm({
        name: "",
        description: "",
        image_url: null,
        price: "",
        promotional_price: "",
        has_promotion: false,
        promotion_start_at: "",
        promotion_end_at: "",
        is_indefinite: true,
        stock_quantity: "",
        min_stock_alert: "5",
        unit: "un",
      });
    }
  }, [product, open]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      toast.error("Preço inválido");
      return;
    }

    const stockQuantity = parseInt(form.stock_quantity);
    if (isNaN(stockQuantity) || stockQuantity < 0) {
      toast.error("Quantidade em estoque inválida");
      return;
    }

    // Validate promotional price
    const promotionalPrice = form.has_promotion && form.promotional_price 
      ? parseFloat(form.promotional_price) 
      : null;
    
    if (form.has_promotion && promotionalPrice !== null && promotionalPrice >= price) {
      toast.error("Preço promocional deve ser menor que o preço original");
      return;
    }

    setSaving(true);
    try {
      const minStockAlert = parseInt(form.min_stock_alert) || 5;

      const data = {
        store_id: storeId,
        category_id: categoryId,
        name: form.name.trim(),
        description: form.description || null,
        image_url: form.image_url,
        price,
        promotional_price: form.has_promotion ? promotionalPrice : null,
        promotion_start_at: form.has_promotion && form.promotion_start_at 
          ? new Date(form.promotion_start_at).toISOString() 
          : null,
        promotion_end_at: form.has_promotion && !form.is_indefinite && form.promotion_end_at 
          ? new Date(form.promotion_end_at).toISOString() 
          : null,
        stock_quantity: stockQuantity,
        min_stock_alert: minStockAlert,
        unit: form.unit,
      };

      if (product) {
        // If stock changed, create movement record
        const stockDiff = stockQuantity - product.stock_quantity;
        
        const { error } = await supabase
          .from("inventory_products")
          .update(data)
          .eq("id", product.id);

        if (error) throw error;

        // Record stock movement if quantity changed
        if (stockDiff !== 0) {
          await supabase.from("inventory_movements").insert({
            store_id: storeId,
            product_id: product.id,
            movement_type: "ajuste",
            quantity: Math.abs(stockDiff),
            previous_stock: product.stock_quantity,
            new_stock: stockQuantity,
            reason: stockDiff > 0 ? "Adição via edição" : "Remoção via edição",
            created_by: "admin",
          });
        }

        toast.success("Produto atualizado!");
      } else {
        const { data: newProduct, error } = await supabase
          .from("inventory_products")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        // Record initial stock entry
        if (stockQuantity > 0) {
          await supabase.from("inventory_movements").insert({
            store_id: storeId,
            product_id: newProduct.id,
            movement_type: "entrada",
            quantity: stockQuantity,
            previous_stock: 0,
            new_stock: stockQuantity,
            reason: "Estoque inicial",
            created_by: "admin",
          });
        }

        toast.success("Produto criado!");
      }

      onSaved();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const priceNum = parseFloat(form.price) || 0;
  const promoNum = parseFloat(form.promotional_price) || 0;
  const discountPercent = priceNum > 0 && promoNum > 0 
    ? Math.round(((priceNum - promoNum) / priceNum) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            {product 
              ? "Atualize as informações do produto"
              : "Adicione um novo produto com controle de estoque"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Imagem do produto</Label>
            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              bucket="product-images"
              folder="inventory"
              aspectRatio="square"
              placeholder="Adicionar imagem"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do produto"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição do produto"
              rows={2}
              className="text-xs min-h-[50px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs">Preço *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-xs">Unidade</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value} className="text-xs">
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Promotion Section */}
          <div className="space-y-2.5 pt-2.5 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Tag className="w-3.5 h-3.5" />
                  Promoção
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Ativar preço promocional
                </p>
              </div>
              <Switch
                checked={form.has_promotion}
                onCheckedChange={(checked) => 
                  setForm({ 
                    ...form, 
                    has_promotion: checked,
                    promotional_price: checked ? (form.promotional_price || String(priceNum * 0.9)) : ""
                  })
                }
              />
            </div>
            
            {form.has_promotion && (
              <div className="space-y-2.5 p-2.5 rounded-md bg-green-500/10 border border-green-500/20">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-price" className="text-xs text-green-700 dark:text-green-400">
                    Preço Promocional (R$)
                  </Label>
                  <Input
                    id="promo-price"
                    type="number"
                    min="0"
                    step="0.01"
                    max={priceNum - 0.01}
                    value={form.promotional_price}
                    onChange={(e) => setForm({ ...form, promotional_price: e.target.value })}
                    className="h-8 text-xs border-green-500/30 focus-visible:ring-green-500"
                  />
                  {promoNum > 0 && priceNum > 0 && discountPercent > 0 && (
                    <p className="text-[10px] text-green-600 font-medium">
                      {discountPercent}% off ({formatCurrency(priceNum - promoNum)})
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="promo-start" className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Início
                  </Label>
                  <Input
                    id="promo-start"
                    type="datetime-local"
                    value={form.promotion_start_at}
                    onChange={(e) => setForm({ ...form, promotion_start_at: e.target.value })}
                    className="h-8 text-xs border-green-500/30 focus-visible:ring-green-500"
                  />
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                      <Infinity className="w-3 h-3" />
                      Indeterminado
                    </Label>
                  </div>
                  <Switch
                    checked={form.is_indefinite}
                    onCheckedChange={(checked) => 
                      setForm({ 
                        ...form, 
                        is_indefinite: checked,
                        promotion_end_at: checked ? "" : form.promotion_end_at
                      })
                    }
                  />
                </div>

                {!form.is_indefinite && (
                  <div className="space-y-1.5">
                    <Label htmlFor="promo-end" className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Fim
                    </Label>
                    <Input
                      id="promo-end"
                      type="datetime-local"
                      value={form.promotion_end_at}
                      min={form.promotion_start_at || undefined}
                      onChange={(e) => setForm({ ...form, promotion_end_at: e.target.value })}
                      className="h-8 text-xs border-green-500/30 focus-visible:ring-green-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stock Section */}
          <div className="grid grid-cols-2 gap-3 pt-2.5 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="stock_quantity" className="text-xs">Estoque *</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min_stock_alert" className="text-xs">Alerta mínimo</Label>
              <Input
                id="min_stock_alert"
                type="number"
                min="0"
                value={form.min_stock_alert}
                onChange={(e) => setForm({ ...form, min_stock_alert: e.target.value })}
                placeholder="5"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Alerta quando o estoque atingir o mínimo
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs">
            {saving ? "Salvando..." : product ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
