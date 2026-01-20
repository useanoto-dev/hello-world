import { useState } from "react";
import { Minus, Plus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price?: number | null;
  image_url: string | null;
  category_id?: string;
}

interface FSWProductSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName?: string;
}

const FSWProductSheet = ({ product, open, onOpenChange, categoryName = "Produto" }: FSWProductSheetProps) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  if (!product) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const displayPrice = product.promotional_price || product.price;
  const hasPromo = product.promotional_price && product.promotional_price < product.price;

  // Mock ingredients for visual consistency
  const ingredients = product.description?.split(",").map(i => i.trim()).filter(Boolean) || [];

  const handleAddToCart = async () => {
    const success = await addToCart({
      id: `${product.id}-${Date.now()}`,
      product_id: product.id,
      name: product.name,
      price: displayPrice * quantity,
      quantity: quantity,
      category: categoryName,
      description: product.description || undefined,
      image_url: product.image_url || undefined,
      unit_base_price: displayPrice,
    });

    if (success) {
      toast.success("Adicionado ao carrinho!");
      setQuantity(1);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 bg-white">
        <SheetHeader className="sr-only">
          <SheetTitle>{product.name}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Back button header */}
          <div className="absolute top-4 left-4 z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-white/90 backdrop-blur-sm border-0 shadow-lg"
              onClick={() => onOpenChange(false)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Product Image */}
          <div className="relative w-full aspect-square bg-gray-100">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                🍽️
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            
            {product.description && (
              <p className="text-gray-600 mt-2 leading-relaxed">
                {product.description}
              </p>
            )}

            {ingredients.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Ingredientes:</h3>
                <div className="flex flex-wrap gap-2">
                  {ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer - Quantity and Add to Cart */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              {/* Quantity Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-semibold w-8 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Price */}
              <div className="text-right">
                {hasPromo && (
                  <span className="text-sm text-gray-400 line-through block">
                    {formatPrice(product.price * quantity)}
                  </span>
                )}
                <span className="text-xl font-bold text-primary">
                  {formatPrice(displayPrice * quantity)}
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90"
              onClick={handleAddToCart}
            >
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FSWProductSheet;
