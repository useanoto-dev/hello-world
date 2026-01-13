import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Package, AlertTriangle, MoreVertical, Pencil, Trash2, Eye, EyeOff, History, PackagePlus, PackageMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryProductForm from "./InventoryProductForm";
import InventoryMovementHistory from "./InventoryMovementHistory";
import InventoryStockAdjustment from "./InventoryStockAdjustment";

interface InventoryCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
}

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

interface InventoryManagerProps {
  category: InventoryCategory;
  storeId: string;
  onBack: () => void;
}

export default function InventoryManager({ category, storeId, onBack }: InventoryManagerProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [showHistory, setShowHistory] = useState<InventoryProduct | null>(null);
  const [showAdjustment, setShowAdjustment] = useState<InventoryProduct | null>(null);

  useEffect(() => {
    loadProducts();
  }, [category.id]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_products")
        .select("*")
        .eq("category_id", category.id)
        .eq("store_id", storeId)
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

  const handleDeleteProduct = async (product: InventoryProduct) => {
    if (!confirm(`Excluir produto "${product.name}"? O histórico de movimentações será mantido.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("inventory_products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;
      toast.success("Produto excluído!");
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir produto");
    }
  };

  const handleToggleActive = async (product: InventoryProduct) => {
    try {
      const { error } = await supabase
        .from("inventory_products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;
      loadProducts();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const openEditProduct = (product: InventoryProduct) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleProductSaved = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    loadProducts();
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_alert && p.is_active);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {category.icon && <span className="text-xl">{category.icon}</span>}
              <h1 className="text-2xl font-bold">{category.name}</h1>
            </div>
            {category.description && (
              <p className="text-muted-foreground text-sm">{category.description}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowProductForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Produto
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle className="text-base">Estoque Baixo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map(p => (
                <Badge key={p.id} variant="destructive" className="gap-1">
                  {p.name}: {p.stock_quantity} {p.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhum produto</h3>
            <p className="text-muted-foreground text-sm text-center mb-4 max-w-sm">
              Adicione seu primeiro produto com controle de estoque.
            </p>
            <Button onClick={() => setShowProductForm(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isLowStock = product.stock_quantity <= product.min_stock_alert;
            
            return (
              <Card 
                key={product.id} 
                className={`group transition-all hover:shadow-md overflow-hidden ${!product.is_active ? "opacity-60" : ""}`}
              >
                {product.image_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate">
                          {product.name}
                        </CardTitle>
                        {!product.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                      {product.description && (
                        <CardDescription className="mt-1 text-xs line-clamp-2">
                          {product.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditProduct(product)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowAdjustment(product)}>
                          <PackagePlus className="w-4 h-4 mr-2" />
                          Ajustar Estoque
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowHistory(product)}>
                          <History className="w-4 h-4 mr-2" />
                          Histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                          {product.is_active ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteProduct(product)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {product.promotional_price ? (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground line-through">
                            R$ {product.price.toFixed(2)}
                          </span>
                          <span className="font-semibold text-primary">
                            R$ {product.promotional_price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold">
                          R$ {product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Badge 
                      variant={isLowStock ? "destructive" : "secondary"}
                      className="gap-1"
                    >
                      <Package className="w-3 h-3" />
                      {product.stock_quantity} {product.unit}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Form Modal */}
      <InventoryProductForm
        open={showProductForm}
        onOpenChange={(open) => {
          setShowProductForm(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        categoryId={category.id}
        storeId={storeId}
        onSaved={handleProductSaved}
      />

      {/* Movement History Modal */}
      {showHistory && (
        <InventoryMovementHistory
          open={!!showHistory}
          onOpenChange={(open) => !open && setShowHistory(null)}
          product={showHistory}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustment && (
        <InventoryStockAdjustment
          open={!!showAdjustment}
          onOpenChange={(open) => !open && setShowAdjustment(null)}
          product={showAdjustment}
          storeId={storeId}
          onAdjusted={() => {
            setShowAdjustment(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}
