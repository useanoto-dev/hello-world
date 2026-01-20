// Product Detail Drawer - FSW Style
import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import DynamicUpsellModal from "./DynamicUpsellModal";

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
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCategory?: (categoryId: string) => void;
}

export default function ProductDetailDrawer({
  product,
  categoryName,
  storeId,
  isOpen,
  onClose,
  onNavigateToCategory,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [showUpsell, setShowUpsell] = useState(false);
  const { addToCart } = useCart();

  // Reset state when product changes
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setShowUpsell(false);
    }
  }, [isOpen, product.id]);

  const basePrice = product.promotional_price ?? product.price;
  const totalPrice = basePrice * quantity;

  const handleAddToCart = () => {
    addToCart({
      id: `${product.id}-${Date.now()}`,
      product_id: product.id,
      name: product.name,
      price: basePrice,
      quantity: quantity,
      category: categoryName,
      description: product.description || undefined,
      image_url: product.image_url || undefined,
    });

    toast.success("Adicionado ao carrinho!");
    
    // Show upsell modal if category is available
    if (product.category_id && storeId) {
      setShowUpsell(true);
    } else {
      onClose();
    }
  };

  const handleUpsellClose = () => {
    setShowUpsell(false);
    onClose();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <div className="flex flex-col h-full">
            {/* Product Image */}
            <div className="relative -mx-6 -mt-6">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-56 object-cover"
                />
              ) : (
                <div className="w-full h-56 bg-muted flex items-center justify-center">
                  <span className="text-6xl">🍽️</span>
                </div>
              )}
            </div>

            {/* Header */}
            <SheetHeader className="mt-4 text-left">
              <SheetTitle className="text-xl">{product.name}</SheetTitle>
            </SheetHeader>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground text-sm mt-2">
                {product.description}
              </p>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer with quantity and add button */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                {/* Quantity controls */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-semibold w-8 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Price */}
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(totalPrice)}
                </span>
              </div>

              <Button
                className="w-full h-12 text-lg font-semibold"
                onClick={handleAddToCart}
              >
                Adicionar ao carrinho
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Upsell Modal */}
      {showUpsell && product.category_id && storeId && (
        <DynamicUpsellModal
          storeId={storeId}
          triggerCategoryId={product.category_id}
          onClose={handleUpsellClose}
          onNavigateToCategory={onNavigateToCategory}
        />
      )}
    </>
  );
}
