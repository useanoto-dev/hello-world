// Dynamic Upsell Modal - Optimized with React Query for instant loading
// Supports sequential flow: shows modals in order based on display_order
import { useState, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import EdgeUpsellModal from "./EdgeUpsellModal";
import DoughUpsellModal from "./DoughUpsellModal";
import AdditionalsUpsellModal from "./AdditionalsUpsellModal";
import ComboUpsellModal from "./ComboUpsellModal";

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
  content_type: string | null;
  display_order: number;
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
  onBack?: () => void;
  onSelectProducts?: () => void;
  onNavigateToCategory?: (categoryId: string) => void;
  sizeId?: string;
  sizeName?: string;
  onSelectEdge?: (edge: { id: string; name: string; price: number } | null) => void;
}

// Fetch all upsell modals for a category - cached globally
async function fetchUpsellModals(storeId: string, triggerCategoryId: string): Promise<UpsellModalConfig[]> {
  const { data, error } = await (supabase as any)
    .from("upsell_modals")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("trigger_category_id", triggerCategoryId)
    .order("display_order");

  if (error) throw error;
  return data || [];
}

// Fetch products for a modal - optimized with parallel category fetch
async function fetchModalProducts(storeId: string, modal: UpsellModalConfig): Promise<Product[]> {
  let categoryIds: string[] = [];

  if (modal.target_category_id) {
    categoryIds = [modal.target_category_id];
  } else if (modal.modal_type === "drink") {
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

    if (categoryIds.length === 0) return [];
  }

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
    const uniqueCatIds = [...new Set(data.map(p => p.category_id).filter(Boolean))] as string[];
    const { data: catsData } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", uniqueCatIds);
    
    const catMap = new Map((catsData || []).map(c => [c.id, c.name]));
    
    return data.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      promotional_price: p.promotional_price,
      image_url: p.image_url,
      category_id: p.category_id || "",
      category_name: catMap.get(p.category_id!) || "Produto"
    }));
  }
  
  return [];
}

// Hook to prefetch upsell modals - call this when user starts pizza flow
export function usePrefetchUpsellModals(storeId: string | undefined, categoryId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    if (!storeId || !categoryId) return;
    
    queryClient.prefetchQuery({
      queryKey: ["upsell-modals", storeId, categoryId],
      queryFn: () => fetchUpsellModals(storeId, categoryId),
      staleTime: 5 * 60 * 1000, // 5 min
    });
  }, [queryClient, storeId, categoryId]);
}

// Product card component - memoized
const ProductCard = memo(function ProductCard({ 
  product, 
  onAdd 
}: { 
  product: Product; 
  onAdd: (p: Product) => void;
}) {
  return (
    <motion.div
      className="p-3 rounded-xl bg-muted/30 border border-border/50"
      whileTap={{ scale: 0.98 }}
    >
      {product.image_url && (
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-24 rounded-lg object-cover mb-2"
          loading="lazy"
        />
      )}
      <p className="font-medium text-[15px] text-gray-800 line-clamp-2">{product.name}</p>
      <p className="text-sm font-normal mt-1 text-gray-500">
        {formatCurrency(product.promotional_price || product.price)}
      </p>
      <button
        onClick={() => onAdd(product)}
        className="w-full mt-2 h-9 text-xs font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" />
        Adicionar
      </button>
    </motion.div>
  );
});

function DynamicUpsellModal({ 
  storeId, 
  triggerCategoryId,
  onClose,
  onBack,
  onSelectProducts,
  onNavigateToCategory,
  sizeId,
  sizeName,
  onSelectEdge,
}: DynamicUpsellModalProps) {
  const [currentModalIndex, setCurrentModalIndex] = useState(0);
  const [showProducts, setShowProducts] = useState(false);
  
  const { addToCart } = useCart();

  // Use React Query for caching - data will be instant if prefetched
  const { data: allModals = [], isLoading } = useQuery({
    queryKey: ["upsell-modals", storeId, triggerCategoryId],
    queryFn: () => fetchUpsellModals(storeId, triggerCategoryId),
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000, // 30 min
  });

  // Current modal config
  const modalConfig = allModals[currentModalIndex] || null;

  // Fetch products for current modal (if needed)
  const { data: products = [] } = useQuery({
    queryKey: ["upsell-products", storeId, modalConfig?.id],
    queryFn: () => fetchModalProducts(storeId, modalConfig!),
    enabled: !!modalConfig && modalConfig.show_quick_add && modalConfig.content_type !== "pizza_edges",
    staleTime: 2 * 60 * 1000,
  });

  // Handle close when no modals found
  const hasNoModals = !isLoading && allModals.length === 0;
  
  // Use effect-like behavior but through render
  if (hasNoModals) {
    // Schedule close for next tick to avoid render-time side effects
    setTimeout(onClose, 0);
    return null;
  }

  // Advance to next modal or close if no more
  const goToNextModal = useCallback(() => {
    const nextIndex = currentModalIndex + 1;
    
    if (nextIndex < allModals.length) {
      setCurrentModalIndex(nextIndex);
      setShowProducts(false);
    } else {
      onClose();
    }
  }, [currentModalIndex, allModals.length, onClose]);

  const handleQuickAdd = useCallback((product: Product) => {
    addToCart({
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      price: product.promotional_price || product.price,
      quantity: 1,
      category: product.category_name || "Produto",
      image_url: product.image_url || undefined,
    });
    toast.success(`${product.name} adicionado!`);
  }, [addToCart]);

  const handlePrimaryAction = useCallback(() => {
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
      goToNextModal();
    }
  }, [modalConfig, products.length, onNavigateToCategory, onClose, onSelectProducts, goToNextModal]);

  const handleSecondaryAction = useCallback(() => {
    if (modalConfig?.secondary_redirect_category_id && onNavigateToCategory) {
      onNavigateToCategory(modalConfig.secondary_redirect_category_id);
      onClose();
      return;
    }
    goToNextModal();
  }, [modalConfig, onNavigateToCategory, onClose, goToNextModal]);

  const handleEdgeSelection = useCallback((edge: { id: string; name: string; price: number } | null) => {
    if (onSelectEdge) {
      onSelectEdge(edge);
    }
    goToNextModal();
  }, [onSelectEdge, goToNextModal]);

  // Don't render anything while loading or no config
  if (isLoading || !modalConfig) {
    return null;
  }

  // Render specialized modals based on content_type
  if (modalConfig.content_type === "pizza_edges" && sizeId) {
    return (
      <EdgeUpsellModal
        storeId={storeId}
        categoryId={triggerCategoryId}
        sizeId={sizeId}
        sizeName={sizeName || ""}
        title={modalConfig.title}
        description={modalConfig.description || undefined}
        secondaryButtonText={modalConfig.secondary_button_text || "Sem Borda"}
        icon={modalConfig.icon || "🧀"}
        onClose={goToNextModal}
        onSelectEdge={handleEdgeSelection}
      />
    );
  }

  if (modalConfig.content_type === "pizza_doughs" && sizeId) {
    return (
      <DoughUpsellModal
        storeId={storeId}
        categoryId={triggerCategoryId}
        sizeId={sizeId}
        sizeName={sizeName || ""}
        title={modalConfig.title}
        description={modalConfig.description || undefined}
        secondaryButtonText={modalConfig.secondary_button_text || "Massa Tradicional"}
        icon={modalConfig.icon || "🥖"}
        onClose={goToNextModal}
        onSelectDough={(dough) => {
          if (dough) {
            toast.success(`Massa ${dough.name} selecionada!`);
          }
          goToNextModal();
        }}
      />
    );
  }

  if (modalConfig.content_type === "additionals") {
    return (
      <AdditionalsUpsellModal
        storeId={storeId}
        categoryId={triggerCategoryId}
        title={modalConfig.title}
        description={modalConfig.description || undefined}
        buttonText={modalConfig.button_text || "Confirmar"}
        secondaryButtonText={modalConfig.secondary_button_text || "Não, obrigado"}
        icon={modalConfig.icon || "➕"}
        maxItems={modalConfig.max_products || 10}
        onClose={goToNextModal}
        onSelectAdditionals={(additionals) => {
          if (additionals.length > 0) {
            toast.success(`${additionals.length} adicional(is) selecionado(s)!`);
          }
          goToNextModal();
        }}
      />
    );
  }

  if (modalConfig.content_type === "combo") {
    let showEdges = true, showDoughs = true, showAdditionals = true;
    const secondaryBtnText = modalConfig.secondary_button_text || "Não, obrigado";
    
    if (secondaryBtnText.includes("|")) {
      const parts = secondaryBtnText.split("|");
      parts.slice(1).forEach(part => {
        if (part.startsWith("edges:")) showEdges = part === "edges:1";
        if (part.startsWith("doughs:")) showDoughs = part === "doughs:1";
        if (part.startsWith("additionals:")) showAdditionals = part === "additionals:1";
      });
    }

    return (
      <ComboUpsellModal
        open={true}
        storeId={storeId}
        categoryId={triggerCategoryId}
        sizeId={sizeId || ""}
        sizeName={sizeName || ""}
        title={modalConfig.title}
        description={modalConfig.description || undefined}
        buttonText={modalConfig.button_text || "Confirmar"}
        showEdges={showEdges}
        showDoughs={showDoughs}
        showAdditionals={showAdditionals}
        onBack={() => {
          if (onBack) {
            onBack();
          } else {
            onClose();
          }
        }}
        onClose={goToNextModal}
        onComplete={(selections) => {
          if (selections.edge) {
            toast.success(`Borda ${selections.edge.name} selecionada!`);
          }
          if (selections.dough) {
            toast.success(`Massa ${selections.dough.name} selecionada!`);
          }
          if (selections.additionals.length > 0) {
            toast.success(`${selections.additionals.length} adicional(is) selecionado(s)!`);
          }
          goToNextModal();
        }}
      />
    );
  }

  const icon = modalConfig.icon || "🥤";
  const buttonText = modalConfig.button_text || "Escolher";
  const secondaryText = modalConfig.secondary_button_text || "Não, obrigado";
  const hasMoreModals = currentModalIndex < allModals.length - 1;

  return (
    <AnimatePresence>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] bg-black/50"
      />
      
      {/* Bottom sheet */}
      <motion.div
        key={modalConfig.id}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Modal progress indicator */}
        {allModals.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-2">
            {allModals.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentModalIndex ? 'bg-primary' : 'bg-muted'
                }`} 
              />
            ))}
          </div>
        )}

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
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAdd={handleQuickAdd} 
                  />
                ))}
              </div>
            </div>

            <div className="px-5 pb-6 pt-3 border-t">
              <button 
                onClick={goToNextModal}
                className="w-full h-12 rounded-xl bg-muted hover:bg-muted/80 font-medium text-sm transition-colors"
              >
                {hasMoreModals ? "Continuar" : "Ir para o carrinho"}
              </button>
            </div>
          </>
        ) : (
          // Main modal view
          <div className="flex-1 flex flex-col px-6 pb-6">
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

            <div className="space-y-3">
              <button
                onClick={handlePrimaryAction}
                className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                {buttonText}
              </button>

              <button
                onClick={handleSecondaryAction}
                className="w-full h-12 rounded-xl border-2 border-border bg-background hover:bg-muted font-medium text-sm transition-colors"
              >
                {secondaryText}
              </button>

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

export default memo(DynamicUpsellModal);
