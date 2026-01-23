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
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 font-storefront">
          <div className="flex flex-col h-full">
            {/* Product Image - w-full h-56 object-cover */}
            <div className="relative">
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

            {/* Content */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {/* Header */}
              <SheetHeader className="text-left mb-2">
                <SheetTitle className="text-2xl font-bold">{product.name}</SheetTitle>
              </SheetHeader>

              {/* Description */}
              {product.description && (
                <p className="text-muted-foreground">
                  {product.description}
                </p>
              )}
            </div>

            {/* Footer with quantity and add button */}
            <div className="border-t border-border p-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                {/* Quantity controls - h-10 w-10 rounded-full */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
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
                    className="h-10 w-10 rounded-full"
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

              {/* Add button - w-full h-14 text-lg font-bold rounded-full */}
              <Button
                className="w-full h-14 text-lg font-bold rounded-full"
                onClick={handleAddToCart}
              >
                Adicionar
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
