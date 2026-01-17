// Product Detail Drawer - For simple products without customization groups
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Minus, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_id?: string | null;
}

interface Props {
  product: Product;
  categoryName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDetailDrawer({
  product,
  categoryName,
  isOpen,
  onClose,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const { addToCart } = useCart();

  // Reset state when product changes
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes("");
    }
  }, [isOpen, product.id]);

  // Block body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const basePrice = product.promotional_price ?? product.price;
  const originalPrice = product.promotional_price ? product.price : null;
  const hasPromotion = product.promotional_price !== null && product.promotional_price < product.price;
  const totalPrice = basePrice * quantity;

  const handleAddToCart = () => {
    let description = product.description || undefined;
    if (notes.trim()) {
      description = description ? `${description} | Obs: ${notes.trim()}` : `Obs: ${notes.trim()}`;
    }

    addToCart({
      id: `${product.id}-${Date.now()}`,
      product_id: product.id,
      name: product.name,
      price: basePrice,
      quantity: quantity,
      category: categoryName,
      description,
      image_url: product.image_url || undefined,
    });

    toast.success("Adicionado ao carrinho!");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        {/* Hero Image Section */}
        <div className="relative flex-shrink-0">
          <div className="relative h-64 sm:h-80 bg-gray-900">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <span className="text-7xl">🍽️</span>
              </div>
            )}
            
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent" />
            
            {/* Back button */}
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            {/* Share button */}
            <button 
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            
            {/* Pull indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
              <ChevronDown className="w-6 h-6 text-gray-400 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="px-4 py-4">
            {/* Product Info */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                {hasPromotion && (
                  <span className="text-base text-muted-foreground line-through">
                    {formatCurrency(originalPrice!)}
                  </span>
                )}
                <span className={cn(
                  "text-xl font-bold",
                  hasPromotion ? "text-green-600" : "text-amber-500"
                )}>
                  {formatCurrency(basePrice)}
                </span>
              </div>
              {product.description && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="bg-muted/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Quantidade</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="w-8 text-center text-xl font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border-2 border-amber-500 bg-amber-500 flex items-center justify-center hover:bg-amber-600 hover:border-amber-600 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="text-sm font-semibold text-foreground">
                Observações
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Sem cebola, bem passado, etc."
                className="mt-2 min-h-[80px] resize-none border-border bg-muted/30"
              />
            </div>
          </div>
        </main>

        {/* Footer - Fixed bottom */}
        <motion.footer
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 25, stiffness: 400 }}
          className="fixed bottom-0 inset-x-0 bg-background border-t border-border p-4 z-10"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">
              {formatCurrency(totalPrice)}
            </span>
          </div>
          <Button
            onClick={handleAddToCart}
            className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg"
          >
            Adicionar ao Carrinho
          </Button>
        </motion.footer>
      </motion.div>
    </AnimatePresence>
  );
}
