// Dynamic Upsell Modal - Fetches configured modals from database and displays them
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ShoppingBag, ChevronRight, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UpsellModalConfig {
  id: string;
  name: string;
  modal_type: string;
  trigger_category_id: string | null;
  target_category_id: string | null;
  title: string;
  description: string | null;
  is_active: boolean;
  show_quick_add: boolean;
  max_products: number;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_id: string;
}

interface Edge {
  id: string;
  name: string;
  price: number;
}

interface DynamicUpsellModalProps {
  storeId: string;
  triggerCategoryId: string;
  onClose: () => void;
  onContinueShopping: (categoryId?: string) => void;
  onSelectEdge?: (edge: Edge | null) => void;
}

export default function DynamicUpsellModal({ 
  storeId, 
  triggerCategoryId,
  onClose,
  onContinueShopping,
  onSelectEdge,
}: DynamicUpsellModalProps) {
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState<UpsellModalConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, totalItems, totalPrice } = useCart();

  useEffect(() => {
    loadModalData();
  }, [storeId, triggerCategoryId]);

  const loadModalData = async () => {
    try {
      // 1. Find active modal for this trigger category
      const { data: modals, error: modalError } = await supabase
        .from("upsell_modals")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .or(`trigger_category_id.eq.${triggerCategoryId},trigger_category_id.is.null`)
        .order("display_order")
        .limit(1);

      if (modalError) throw modalError;

      if (!modals || modals.length === 0) {
        // No modal configured, close
        onClose();
        return;
      }

      const modal = modals[0];
      setModalConfig(modal);

      // 2. Load data based on modal type
      if (modal.modal_type === "edge") {
        // Load pizza edges
        await loadEdges(modal);
      } else if (modal.modal_type === "drink" || modal.modal_type === "accompaniment") {
        // Load products from target category or drink categories
        await loadProducts(modal);
      } else {
        // Custom/additional - load categories and products
        await loadCategoriesAndProducts(modal);
      }

    } catch (error) {
      console.error("Error loading modal data:", error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const loadEdges = async (modal: UpsellModalConfig) => {
    // For edge modals, we need to fetch the pizza_edges with prices
    // This would require the sizeId to be passed - for now, show a simple list
    const { data, error } = await supabase
      .from("pizza_edges")
      .select("id, name")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order");

    if (!error && data) {
      // Map edges with a default price (or we'd need size context)
      setEdges(data.map(e => ({ ...e, price: 0 })));
    }
  };

  const loadProducts = async (modal: UpsellModalConfig) => {
    let query = supabase
      .from("products")
      .select("id, name, price, promotional_price, image_url, category_id")
      .eq("store_id", storeId)
      .eq("is_available", true);

    if (modal.target_category_id) {
      query = query.eq("category_id", modal.target_category_id);
    } else if (modal.modal_type === "drink") {
      // Auto-detect drink categories
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .eq("store_id", storeId)
        .eq("is_active", true);

      const drinkCatIds = (cats || [])
        .filter(c => 
          c.name.toLowerCase().includes("bebida") || 
          c.name.toLowerCase().includes("drink") ||
          c.name.toLowerCase().includes("refrigerante") ||
          c.name.toLowerCase().includes("suco")
        )
        .map(c => c.id);

      if (drinkCatIds.length > 0) {
        query = query.in("category_id", drinkCatIds);
      }
    }

    const { data, error } = await query
      .order("is_featured", { ascending: false })
      .limit(modal.max_products || 6);

    if (!error) {
      setProducts(data || []);
    }

    // Also load categories for navigation
    const { data: catsData } = await supabase
      .from("categories")
      .select("id, name, icon, image_url")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .neq("id", triggerCategoryId)
      .order("display_order")
      .limit(4);

    setCategories(catsData || []);
  };

  const loadCategoriesAndProducts = async (modal: UpsellModalConfig) => {
    // Load categories
    const { data: catsData } = await supabase
      .from("categories")
      .select("id, name, icon, image_url")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .neq("id", triggerCategoryId)
      .order("display_order")
      .limit(4);

    setCategories(catsData || []);

    // Load products
    let query = supabase
      .from("products")
      .select("id, name, price, promotional_price, image_url, category_id")
      .eq("store_id", storeId)
      .eq("is_available", true)
      .neq("category_id", triggerCategoryId);

    if (modal.target_category_id) {
      query = query.eq("category_id", modal.target_category_id);
    }

    const { data: prodsData } = await query
      .order("is_featured", { ascending: false })
      .limit(modal.max_products || 6);

    setProducts(prodsData || []);
  };

  const handleQuickAdd = (product: Product) => {
    addToCart({
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      price: product.promotional_price || product.price,
      quantity: 1,
      category: categories.find(c => c.id === product.category_id)?.name || "Produto",
      image_url: product.image_url || undefined,
    });
    toast.success(`${product.name} adicionado!`);
  };

  const handleSelectEdge = (edge: Edge) => {
    setSelectedEdge(edge);
  };

  const handleConfirmEdge = () => {
    if (onSelectEdge) {
      onSelectEdge(selectedEdge);
    }
    onClose();
  };

  const handleSkipEdge = () => {
    if (onSelectEdge) {
      onSelectEdge(null);
    }
    onClose();
  };

  const handleGoToCheckout = () => {
    onClose();
    navigate(`/cardapio/${slug}/finalizar`);
  };

  const handleSelectCategory = (categoryId: string) => {
    onClose();
    onContinueShopping(categoryId);
  };

  if (!modalConfig) return null;

  // Edge modal layout
  if (modalConfig.modal_type === "edge") {
    return (
      <Drawer open onOpenChange={(open) => !open && handleSkipEdge()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-lg">
                  🍕 {modalConfig.title}
                </DrawerTitle>
                {modalConfig.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {modalConfig.description}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleSkipEdge}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {edges.map((edge) => (
                  <motion.button
                    key={edge.id}
                    onClick={() => handleSelectEdge(edge)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 w-full text-left transition-all",
                      selectedEdge?.id === edge.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      🍕
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{edge.name}</p>
                      {edge.price > 0 && (
                        <p className="text-sm text-primary">
                          + {formatCurrency(edge.price)}
                        </p>
                      )}
                    </div>
                    {selectedEdge?.id === edge.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-4 bg-background space-y-3">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleSkipEdge}
              >
                Sem borda
              </Button>
              <Button 
                className="flex-1"
                onClick={handleConfirmEdge}
                disabled={!selectedEdge}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Drink/Accompaniment/Custom modal layout
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg flex items-center gap-2">
                {modalConfig.modal_type === "drink" ? "🥤" : 
                 modalConfig.modal_type === "accompaniment" ? "🍟" : 
                 modalConfig.modal_type === "additional" ? "➕" : "✨"}
                {modalConfig.title}
              </DrawerTitle>
              {modalConfig.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {modalConfig.description}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Quick add products */}
              {products.length > 0 && modalConfig.show_quick_add && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Adicione rapidamente
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {products.slice(0, modalConfig.max_products).map((product) => (
                      <motion.div
                        key={product.id}
                        className="p-3 rounded-xl border border-border bg-card"
                        whileTap={{ scale: 0.98 }}
                      >
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-20 rounded-lg object-cover mb-2"
                          />
                        )}
                        <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                        <p className="text-sm text-primary font-semibold">
                          {formatCurrency(product.promotional_price || product.price)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 h-8 text-xs gap-1"
                          onClick={() => handleQuickAdd(product)}
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories to explore */}
              {categories.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Explore outras categorias
                  </h3>
                  <div className="grid gap-2">
                    {categories.slice(0, 3).map((category) => (
                      <motion.button
                        key={category.id}
                        onClick={() => handleSelectCategory(category.id)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left w-full"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {category.image_url ? (
                          <img 
                            src={category.image_url} 
                            alt={category.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                            {category.icon || "🍽️"}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Toque para ver opções
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-background space-y-3">
          {totalItems > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {totalItems} {totalItems === 1 ? "item" : "itens"} no carrinho
              </span>
              <span className="font-semibold">{formatCurrency(totalPrice)}</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onContinueShopping()}
            >
              Continuar Pedido
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={handleGoToCheckout}
            >
              <Check className="w-4 h-4" />
              Finalizar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
