// Beverage Products Manager - Manage products within a beverage type
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BeverageProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
}

interface BeverageProductsManagerProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  categoryId: string;
  beverageTypeId: string;
  beverageTypeName: string;
}

// Sortable Product Item
function SortableProductItem({
  product,
  onEdit,
  onDelete,
  onToggle,
}: {
  product: BeverageProduct;
  onEdit: (product: BeverageProduct) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg p-3 flex items-center gap-3",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        type="button"
        className="touch-none text-muted-foreground hover:text-foreground cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">🥤</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
        <p className="text-sm text-red-600 font-semibold">
          {formatPrice(product.promotional_price || product.price)}
          {product.promotional_price && product.promotional_price < product.price && (
            <span className="text-xs text-muted-foreground line-through ml-2">
              {formatPrice(product.price)}
            </span>
          )}
        </p>
      </div>

      <Switch
        checked={product.is_active}
        onCheckedChange={(checked) => onToggle(product.id, checked)}
      />

      <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
        Editar
      </Button>

      <button
        onClick={() => onDelete(product.id)}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Product Form Modal
function ProductFormModal({
  open,
  onClose,
  product,
  onSave,
  storeId,
}: {
  open: boolean;
  onClose: () => void;
  product: BeverageProduct | null;
  onSave: (product: Partial<BeverageProduct>) => void;
  storeId: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setPromotionalPrice(product.promotional_price?.toString() || "");
      setImageUrl(product.image_url || "");
    } else if (open) {
      setName("");
      setDescription("");
      setPrice("");
      setPromotionalPrice("");
      setImageUrl("");
    }
  }, [open, product]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${storeId}/beverages/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const priceValue = parseFloat(price.replace(",", ".")) || 0;
    const promoValue = promotionalPrice ? parseFloat(promotionalPrice.replace(",", ".")) : null;

    onSave({
      id: product?.id,
      name: name.trim(),
      description: description.trim() || null,
      price: priceValue,
      promotional_price: promoValue,
      image_url: imageUrl || null,
      is_active: product?.is_active ?? true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Upload */}
          <div className="flex justify-center">
            <label className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Coca-Cola 350ml"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do produto (opcional)"
              rows={2}
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Preço *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promoPrice">Preço Promocional</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="promoPrice"
                  value={promotionalPrice}
                  onChange={(e) => setPromotionalPrice(e.target.value)}
                  placeholder="0,00"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={uploading}>
            {product ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BeverageProductsManager({
  open,
  onClose,
  storeId,
  categoryId,
  beverageTypeId,
  beverageTypeName,
}: BeverageProductsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<BeverageProduct[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BeverageProduct | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (open && beverageTypeId) {
      loadProducts();
    }
  }, [open, beverageTypeId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("beverage_products")
        .select("*")
        .eq("beverage_type_id", beverageTypeId)
        .order("display_order");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Partial<BeverageProduct>) => {
    try {
      if (productData.id) {
        // Update existing
        const { error } = await supabase
          .from("beverage_products")
          .update({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            promotional_price: productData.promotional_price,
            image_url: productData.image_url,
          })
          .eq("id", productData.id);

        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        // Create new
        const { error } = await supabase
          .from("beverage_products")
          .insert({
            store_id: storeId,
            category_id: categoryId,
            beverage_type_id: beverageTypeId,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            promotional_price: productData.promotional_price,
            image_url: productData.image_url,
            display_order: products.length,
          });

        if (error) throw error;
        toast.success("Produto adicionado!");
      }

      setFormOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Erro ao salvar produto");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;

    try {
      const { error } = await supabase
        .from("beverage_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Produto excluído!");
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("beverage_products")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      setProducts(products.map((p) => (p.id === id ? { ...p, is_active: isActive } : p)));
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    const newOrder = arrayMove(products, oldIndex, newIndex);

    setProducts(newOrder);

    // Update order in database
    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .from("beverage_products")
          .update({ display_order: i })
          .eq("id", newOrder[i].id);
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{beverageTypeName}</h1>
            <p className="text-xs text-muted-foreground">Gerenciar produtos</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <p className="text-4xl mb-2">🥤</p>
              <p className="text-sm text-muted-foreground">Nenhum produto cadastrado</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingProduct(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro produto
              </Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {products.map((product) => (
                    <SortableProductItem
                      key={product.id}
                      product={product}
                      onEdit={(p) => {
                        setEditingProduct(p);
                        setFormOpen(true);
                      }}
                      onDelete={handleDeleteProduct}
                      onToggle={handleToggleActive}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {products.length > 0 && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar produto
            </button>
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveProduct}
        storeId={storeId}
      />
    </div>
  );
}
