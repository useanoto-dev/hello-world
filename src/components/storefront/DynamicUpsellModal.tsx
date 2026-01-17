// Dynamic Upsell Modal - Fetches configured modals from database and displays them
// Appears as overlay on top of current page/drawer
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_id: string;
  category_name?: string;
}

interface DynamicUpsellModalProps {
  storeId: string;
  triggerCategoryId: string;
  onClose: () => void;
}

export default function DynamicUpsellModal({ 
  storeId, 
  triggerCategoryId,
  onClose,
}: DynamicUpsellModalProps) {
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState<UpsellModalConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  const { addToCart } = useCart();

  useEffect(() => {
    loadModalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, triggerCategoryId]);

  const loadModalData = async () => {
    try {
      // Query upsell_modals table (not in generated types, so we use type assertion)
      const { data: modals, error: modalError } = await (supabase as any)
        .from("upsell_modals")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("trigger_category_id", triggerCategoryId)
        .order("display_order")
        .limit(1);

      if (modalError) throw modalError;

      if (!modals || modals.length === 0) {
        // No modal configured for this category, close
        onClose();
        return;
      }

      const modal = modals[0] as UpsellModalConfig;
      setModalConfig(modal);

      // Load products based on modal type
      await loadProducts(modal);

    } catch (error) {
      console.error("Error loading modal data:", error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (modal: UpsellModalConfig) => {
    try {
      let categoryIds: string[] = [];

      if (modal.target_category_id) {
        categoryIds = [modal.target_category_id];
      } else if (modal.modal_type === "drink") {
        // Auto-detect drink categories
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .eq("store_id", storeId)
          .eq("is_active", true);

        categoryIds = (cats || [])
          .filter(c => 
            c.name.toLowerCase().includes("bebida") || 
            c.name.toLowerCase().includes("drink") ||
            c.name.toLowerCase().includes("refrigerante") ||
            c.name.toLowerCase().includes("suco")
          )
          .map(c => c.id);

        if (categoryIds.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }
      }

      // Build products query
      let query = supabase
        .from("products")
        .select("id, name, price, promotional_price, image_url, category_id")
        .eq("store_id", storeId)
        .eq("is_available", true);

      if (categoryIds.length > 0) {
        query = query.in("category_id", categoryIds);
      }

      const { data, error } = await query
        .order("is_featured", { ascending: false })
        .limit(modal.max_products || 6);

      if (error) throw error;

      if (data && data.length > 0) {
        // Get category names
        const uniqueCatIds = [...new Set(data.map(p => p.category_id).filter(Boolean))] as string[];
        const { data: catsData } = await supabase
          .from("categories")
          .select("id, name")
          .in("id", uniqueCatIds);
        
        const catMap = new Map((catsData || []).map(c => [c.id, c.name]));
        
        setProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          promotional_price: p.promotional_price,
          image_url: p.image_url,
          category_id: p.category_id || "",
          category_name: catMap.get(p.category_id!) || "Produto"
        })));
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    }
  };

  const handleQuickAdd = (product: Product) => {
    addToCart({
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      price: product.promotional_price || product.price,
      quantity: 1,
      category: product.category_name || "Produto",
      image_url: product.image_url || undefined,
    });
    toast.success(`${product.name} adicionado!`);
  };

  // Get icon based on modal type
  const getIcon = () => {
    if (!modalConfig) return "✨";
    switch (modalConfig.modal_type) {
      case "drink": return "🥤";
      case "accompaniment": return "🍟";
      case "additional": return "➕";
      case "edge": return "🍕";
      default: return "✨";
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop overlay - blocks interaction with content behind */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50"
        // No onClick - user must use the close button
      />
      
      {/* Bottom sheet - slides up from bottom */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[101] bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl max-h-[55vh] flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              {getIcon()}
              {modalConfig?.title || "Sugestão"}
            </h3>
            {modalConfig?.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {modalConfig.description}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Products - horizontal scroll */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {loading ? (
            <div className="flex gap-3">
              <Skeleton className="h-28 w-32 flex-shrink-0 rounded-xl" />
              <Skeleton className="h-28 w-32 flex-shrink-0 rounded-xl" />
              <Skeleton className="h-28 w-32 flex-shrink-0 rounded-xl" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">{getIcon()}</p>
              <p className="text-sm text-muted-foreground">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  className="flex-shrink-0 w-32 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50"
                  whileTap={{ scale: 0.97 }}
                >
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-20 rounded-lg object-cover mb-2"
                    />
                  )}
                  <p className="font-medium text-xs line-clamp-2 text-foreground">{product.name}</p>
                  <p className="text-xs text-primary font-semibold mt-1">
                    {formatCurrency(product.promotional_price || product.price)}
                  </p>
                  <button
                    onClick={() => handleQuickAdd(product)}
                    className="w-full mt-2 h-7 text-[10px] font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button 
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground font-medium text-sm transition-colors"
          >
            Continuar
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}