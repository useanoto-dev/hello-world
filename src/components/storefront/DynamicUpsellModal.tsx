// Dynamic Upsell Modal - Fetches configured modals from database and displays them
// Beautiful bottom sheet design matching the reference image
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowLeft } from "lucide-react";
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
  button_text: string | null;
  button_color: string | null;
  secondary_button_text: string | null;
  icon: string | null;
  primary_redirect_category_id: string | null;
  secondary_redirect_category_id: string | null;
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
  onSelectProducts?: () => void;
  onNavigateToCategory?: (categoryId: string) => void;
}

export default function DynamicUpsellModal({ 
  storeId, 
  triggerCategoryId,
  onClose,
  onSelectProducts,
  onNavigateToCategory,
}: DynamicUpsellModalProps) {
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState<UpsellModalConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  
  const { addToCart } = useCart();

  useEffect(() => {
    loadModalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, triggerCategoryId]);

  const loadModalData = async () => {
    try {
      // Query upsell_modals table
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

      // Pre-load products for quick add
      if (modal.show_quick_add) {
        await loadProducts(modal);
      }

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

  const handlePrimaryAction = () => {
    // If redirect category is configured, navigate to it
    if (modalConfig?.primary_redirect_category_id && onNavigateToCategory) {
      onNavigateToCategory(modalConfig.primary_redirect_category_id);
      onClose();
      return;
    }
    
    if (modalConfig?.show_quick_add && products.length > 0) {
      setShowProducts(true);
    } else if (onSelectProducts) {
      onSelectProducts();
    } else {
      onClose();
    }
  };

  const handleSecondaryAction = () => {
    // If redirect category is configured for secondary button, navigate to it
    if (modalConfig?.secondary_redirect_category_id && onNavigateToCategory) {
      onNavigateToCategory(modalConfig.secondary_redirect_category_id);
      onClose();
      return;
    }
    onClose();
  };

  // Don't render anything until we've confirmed there's a modal configured
  if (loading || !modalConfig) {
    return null;
  }

  const buttonColor = modalConfig.button_color || "#22c55e";
  const icon = modalConfig.icon || "🥤";
  const buttonText = modalConfig.button_text || "Escolher";
  const secondaryText = modalConfig.secondary_button_text || "Não, obrigado";

  return (
    <AnimatePresence>
      {/* Backdrop overlay - blocks interaction with content behind */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50"
      />
      
      {/* Bottom sheet - slides up from bottom */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {showProducts ? (
          // Products view
          <>
            <div className="px-5 pb-3 flex items-center gap-3">
              <button 
                onClick={() => setShowProducts(false)}
                className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-semibold">
                {modalConfig?.title?.split(" ")[0]} {modalConfig?.title?.split(" ")[1]}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    className="p-3 rounded-xl bg-muted/30 border border-border/50"
                    whileTap={{ scale: 0.98 }}
                  >
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-24 rounded-lg object-cover mb-2"
                      />
                    )}
                    <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: buttonColor }}>
                      {formatCurrency(product.promotional_price || product.price)}
                    </p>
                    <button
                      onClick={() => handleQuickAdd(product)}
                      className="w-full mt-2 h-9 text-xs font-medium rounded-lg text-white transition-colors flex items-center justify-center gap-1"
                      style={{ backgroundColor: buttonColor }}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="px-5 pb-6 pt-3 border-t">
              <button 
                onClick={onClose}
                className="w-full h-12 rounded-xl bg-muted hover:bg-muted/80 font-medium text-sm transition-colors"
              >
                Continuar para o carrinho
              </button>
            </div>
          </>
        ) : (
          // Main modal view (like the reference image)
          <div className="flex-1 flex flex-col px-6 pb-6">
            {/* Icon and content - centered */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <span className="text-5xl mb-4">{icon}</span>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {modalConfig.title}
              </h2>
              {modalConfig.description && (
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  {modalConfig.description}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {/* Primary button */}
              <button
                onClick={handlePrimaryAction}
                className="w-full h-14 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                style={{ backgroundColor: buttonColor }}
              >
                <Plus className="w-5 h-5" />
                {buttonText}
              </button>

              {/* Secondary button */}
              <button
                onClick={handleSecondaryAction}
                className="w-full h-12 rounded-xl border-2 border-border bg-background hover:bg-muted font-medium text-sm transition-colors"
              >
                {secondaryText}
              </button>

              {/* Back link */}
              <button
                onClick={onClose}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
