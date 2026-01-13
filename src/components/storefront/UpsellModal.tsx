// Upsell Modal - Suggests additional items from other categories after adding to cart
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "react-router-dom";

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

interface UpsellModalProps {
  storeId: string;
  excludeCategoryId?: string;
  onClose: () => void;
  onContinueShopping: (categoryId: string) => void;
}

export default function UpsellModal({ 
  storeId, 
  excludeCategoryId, 
  onClose,
  onContinueShopping 
}: UpsellModalProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, totalItems, totalPrice } = useCart();

  useEffect(() => {
    loadSuggestions();
  }, [storeId, excludeCategoryId]);

  const loadSuggestions = async () => {
    try {
      // Fetch categories that are different from the one just added
      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("id, name, icon, image_url")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .neq("id", excludeCategoryId || "")
        .order("display_order")
        .limit(4);

      if (catError) throw catError;
      setCategories(categoriesData || []);

      // Fetch some popular products from other categories
      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select("id, name, price, promotional_price, image_url, category_id")
        .eq("store_id", storeId)
        .eq("is_available", true)
        .neq("category_id", excludeCategoryId || "")
        .order("is_featured", { ascending: false })
        .limit(6);

      if (prodError) throw prodError;
      setSuggestedProducts(productsData || []);

    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.promotional_price || product.price,
      quantity: 1,
      category: categories.find(c => c.id === product.category_id)?.name || "Produto",
      image_url: product.image_url || undefined,
    });
    toast.success(`${product.name} adicionado!`);
  };

  const handleGoToCheckout = () => {
    onClose();
    navigate(`/cardapio/${slug}/finalizar`);
  };

  const handleSelectCategory = (categoryId: string) => {
    onClose();
    onContinueShopping(categoryId);
  };

  // Auto-detect drink/beverage categories by name
  const drinkCategories = categories.filter(c => 
    c.name.toLowerCase().includes("bebida") || 
    c.name.toLowerCase().includes("drink") ||
    c.name.toLowerCase().includes("refrigerante") ||
    c.name.toLowerCase().includes("suco")
  );

  const otherCategories = categories.filter(c => 
    !drinkCategories.some(d => d.id === c.id)
  );

  const displayCategories = drinkCategories.length > 0 
    ? [...drinkCategories, ...otherCategories.slice(0, 3 - drinkCategories.length)]
    : categories.slice(0, 3);

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Deseja mais alguma coisa?
              </DrawerTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Aproveite para completar seu pedido
              </p>
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
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Categories to explore */}
              {displayCategories.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Escolha uma categoria
                  </h3>
                  <div className="grid gap-2">
                    {displayCategories.map((category) => (
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

              {/* Quick add products */}
              {suggestedProducts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Adicione rapidamente
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestedProducts.slice(0, 4).map((product) => (
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
                          className="w-full mt-2 h-8 text-xs"
                          onClick={() => handleQuickAdd(product)}
                        >
                          + Adicionar
                        </Button>
                      </motion.div>
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
              onClick={onClose}
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
