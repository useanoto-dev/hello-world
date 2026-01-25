// Beverage Products Selection Drawer - Fullscreen like Pizza Flavors
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Share2, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BeverageProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  is_active: boolean;
}

interface BeverageProductsDrawerProps {
  open: boolean;
  onClose: () => void;
  beverageTypeId: string;
  beverageTypeName: string;
  storeId: string;
  categoryId: string;
  onAddToCart: (product: BeverageProduct) => void;
}

async function fetchBeverageProducts(beverageTypeId: string) {
  const { data, error } = await supabase
    .from("beverage_products")
    .select("*")
    .eq("beverage_type_id", beverageTypeId)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data || [];
}

export function BeverageProductsDrawer({
  open,
  onClose,
  beverageTypeId,
  beverageTypeName,
  storeId,
  categoryId,
  onAddToCart,
}: BeverageProductsDrawerProps) {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["beverage-products", beverageTypeId],
    queryFn: () => fetchBeverageProducts(beverageTypeId),
    enabled: open && !!beverageTypeId,
  });

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
      document.body.style.overflow = "hidden";
      setAddedIds(new Set());
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: beverageTypeName,
      text: `Confira os ${beverageTypeName} disponíveis!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!");
      }
    } catch {
      // User cancelled share
    }
  }, [beverageTypeName]);

  const handleAddProduct = useCallback((product: BeverageProduct) => {
    onAddToCart(product);
    setAddedIds((prev) => new Set(prev).add(product.id));
    
    // Remove the checkmark after 2 seconds
    setTimeout(() => {
      setAddedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }, 2000);
  }, [onAddToCart]);

  const getEffectivePrice = (product: BeverageProduct) => {
    const now = new Date();
    // Simple check - if promotional_price exists and is less than price, use it
    if (product.promotional_price && product.promotional_price < product.price) {
      return product.promotional_price;
    }
    return product.price;
  };

  // Product Card Component
  const ProductCard = ({ product }: { product: BeverageProduct }) => {
    const isAdded = addedIds.has(product.id);
    const effectivePrice = getEffectivePrice(product);
    const hasPromo = product.promotional_price && product.promotional_price < product.price;

    return (
      <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
        {/* Product Image */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              🥤
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[15px] text-gray-800 leading-snug">
            {product.name}
          </p>
          {product.description && (
            <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {hasPromo && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <span className="text-sm font-semibold text-red-600">
              {formatCurrency(effectivePrice)}
            </span>
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={() => handleAddProduct(product)}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isAdded
              ? "bg-green-500 text-white"
              : "bg-amber-500 hover:bg-amber-600 text-white"
          )}
        >
          {isAdded ? (
            <Check className="w-5 h-5" strokeWidth={3} />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  };

  if (!isVisible && !open) return null;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isClosing ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60"
            onClick={handleClose}
          />

          {/* Full screen drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: isClosing ? "100%" : 0 }}
            exit={{ y: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 350,
              mass: 0.8
            }}
            className="fixed inset-0 z-[101] bg-background flex flex-col"
          >
            {/* Desktop Header */}
            <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <span className="text-lg font-semibold text-foreground">
                  {beverageTypeName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                  <Search className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <Share2 className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </header>

            {/* Mobile Fixed Header */}
            <div className="fixed top-0 inset-x-0 z-20 flex items-center justify-between p-4 lg:hidden">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto pb-8">
              {/* Mobile Hero Section */}
              <div className="relative lg:hidden">
                <div className="relative h-40 sm:h-48 bg-gradient-to-br from-cyan-100 to-blue-200">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-7xl">🥤</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4 lg:max-w-2xl lg:mx-auto lg:px-8 lg:py-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex gap-6 mb-6 items-start">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-cyan-100 to-blue-200">
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">🥤</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pt-2">
                    <h1 className="text-xl font-bold text-foreground leading-tight uppercase">
                      {beverageTypeName}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      Escolha as bebidas que deseja adicionar ao seu pedido
                    </p>
                  </div>
                </div>

                {/* Mobile Title */}
                <div className="mb-5 lg:hidden">
                  <h1 className="text-2xl font-bold text-foreground leading-tight">
                    {beverageTypeName}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Toque no + para adicionar ao pedido
                  </p>
                </div>

                {/* Products List */}
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-5xl mb-2">🥤</p>
                    <p className="text-sm text-muted-foreground">
                      Nenhum produto disponível nesta categoria
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </main>

            {/* Footer with Back Button */}
            <footer className="p-4 border-t border-border bg-background safe-area-bottom">
              <div className="max-w-2xl mx-auto">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full h-12 text-base font-semibold rounded-xl"
                >
                  Voltar para bebidas
                </Button>
              </div>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
