// Beverages List Page - Grouped by beverage type
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, GlassWater, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BeverageType {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
}

interface BeverageProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  promotional_price: number | null;
  image_url: string | null;
  is_active: boolean;
  beverage_type_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function BeveragesListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [beverageTypes, setBeverageTypes] = useState<BeverageType[]>([]);
  const [beverageProducts, setBeverageProducts] = useState<BeverageProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteProduct, setDeleteProduct] = useState<BeverageProduct | null>(null);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      // Load category info
      if (categoryId) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id, name")
          .eq("id", categoryId)
          .single();
        
        if (cat) {
          setCategory(cat as Category);
        }

        // Load beverage types
        const { data: types } = await supabase
          .from("beverage_types")
          .select("id, name, icon, image_url")
          .eq("category_id", categoryId)
          .order("display_order");

        setBeverageTypes((types as BeverageType[]) || []);

        // Load beverage products
        const { data: products } = await supabase
          .from("beverage_products")
          .select("id, name, description, price, promotional_price, image_url, is_active, beverage_type_id")
          .eq("category_id", categoryId)
          .order("display_order");

        setBeverageProducts((products as BeverageProduct[]) || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (product: BeverageProduct) => {
    try {
      const { error } = await supabase
        .from("beverage_products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;

      setBeverageProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p)
      );

      toast.success(product.is_active ? "Bebida ocultada do cardápio" : "Bebida visível no cardápio");
    } catch (error: any) {
      toast.error("Erro ao atualizar bebida");
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      const { error } = await supabase
        .from("beverage_products")
        .delete()
        .eq("id", deleteProduct.id);

      if (error) throw error;

      setBeverageProducts(prev => prev.filter(p => p.id !== deleteProduct.id));
      toast.success("Bebida excluída!");
      setDeleteProduct(null);
    } catch (error: any) {
      toast.error("Erro ao excluir bebida");
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "R$ 0,00";
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const filteredProducts = beverageProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductsByType = (typeId: string) =>
    filteredProducts.filter(p => p.beverage_type_id === typeId);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <div className="bg-card border-b border-border px-4 py-3">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/dashboard/products")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {category?.name || "Bebidas"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {beverageProducts.length} bebidas cadastradas
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => navigate(`/dashboard/beverage/new?categoryId=${categoryId}`)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nova Bebida
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 pb-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar bebida..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {beverageTypes.length === 0 ? (
          <div className="text-center py-12">
            <GlassWater className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum tipo de bebida cadastrado
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Configure os tipos de bebida na edição da categoria
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/category/edit?edit=${categoryId}`)}
            >
              Editar Categoria
            </Button>
          </div>
        ) : (
          beverageTypes.map(type => {
            const typeProducts = getProductsByType(type.id);
            
            return (
              <div key={type.id} className="bg-card rounded-lg border border-border overflow-hidden">
                {/* Type Header */}
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {type.image_url ? (
                      <img 
                        src={type.image_url} 
                        alt={type.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <GlassWater className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-foreground">{type.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {typeProducts.length} {typeProducts.length === 1 ? 'bebida' : 'bebidas'}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/dashboard/beverage/new?categoryId=${categoryId}&typeId=${type.id}`)}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </Button>
                </div>

                {/* Products List */}
                {typeProducts.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma bebida cadastrada neste tipo
                    </p>
                    <button
                      onClick={() => navigate(`/dashboard/beverage/new?categoryId=${categoryId}&typeId=${type.id}`)}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      + Adicionar bebida
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {typeProducts.map(product => {
                      const hasPromo = product.promotional_price && product.promotional_price < (product.price || 0);
                      
                      return (
                        <div 
                          key={product.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
                            !product.is_active && "opacity-50"
                          )}
                        >
                          {/* Image */}
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <GlassWater className="w-6 h-6 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm truncate">
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {hasPromo ? (
                                <>
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatPrice(product.price)}
                                  </span>
                                  <span className="text-sm font-semibold text-green-600">
                                    {formatPrice(product.promotional_price)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm font-semibold text-foreground">
                                  {formatPrice(product.price)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={product.is_active}
                              onCheckedChange={() => handleToggleActive(product)}
                              className="data-[state=checked]:bg-green-500"
                            />
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/dashboard/beverage/edit?edit=${product.id}&categoryId=${categoryId}`)}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteProduct(product)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bebida?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteProduct?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
