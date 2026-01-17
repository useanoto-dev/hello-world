// Dynamic Upsell Modal - Fetches configured modals from database and displays them
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

  if (!modalConfig) return null;

  // Get icon based on modal type
  const getIcon = () => {
    switch (modalConfig.modal_type) {
      case "drink": return "🥤";
      case "accompaniment": return "🍟";
      case "additional": return "➕";
      case "edge": return "🍕";
      default: return "✨";
    }
  };

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg flex items-center gap-2">
                {getIcon()}
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">{getIcon()}</p>
              <p className="text-muted-foreground">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  className="p-3 rounded-xl border border-border bg-card"
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
                  <p className="text-sm text-primary font-semibold mt-1">
                    {formatCurrency(product.promotional_price || product.price)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 h-9 text-xs gap-1"
                    onClick={() => handleQuickAdd(product)}
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-background">
          <Button 
            className="w-full"
            onClick={onClose}
          >
            <Check className="w-4 h-4 mr-2" />
            Continuar
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
