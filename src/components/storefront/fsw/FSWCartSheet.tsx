import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart, ServiceType } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";

interface FSWCartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FSWCartSheet = ({ open, onOpenChange }: FSWCartSheetProps) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { 
    cart: items, 
    totalPrice: total, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    serviceType,
    setServiceType 
  } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleFinishOrder = () => {
    onOpenChange(false);
    navigate(`/cardapio/${slug}/checkout/servico`);
  };

  const handleUpdateQuantity = async (productId: string, delta: number) => {
    const item = items.find(i => i.id === productId);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    
    await updateQuantity(productId, newQty);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 bg-white">
        <SheetHeader className="p-4 border-b border-gray-200">
          <SheetTitle className="text-lg font-bold text-gray-900">
            Seu Carrinho
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-60px)]">
          {/* Consumption Method Selector */}
          <div className="flex gap-2 p-4 border-b border-gray-100">
            <Button
              variant={serviceType === "dine_in" ? "default" : "outline"}
              className={`flex-1 rounded-full ${
                serviceType === "dine_in" 
                  ? "bg-primary text-primary-foreground" 
                  : "border-gray-200"
              }`}
              onClick={() => setServiceType("dine_in")}
            >
              Comer no local
            </Button>
            <Button
              variant={serviceType === "pickup" ? "default" : "outline"}
              className={`flex-1 rounded-full ${
                serviceType === "pickup" 
                  ? "bg-primary text-primary-foreground" 
                  : "border-gray-200"
              }`}
              onClick={() => setServiceType("pickup")}
            >
              Para viagem
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg">Seu carrinho está vazio</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">
                        {item.name}
                      </h4>
                      <span className="font-bold text-primary text-sm whitespace-nowrap">
                        {formatPrice(item.price)}
                      </span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-7 h-7 rounded-full"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-7 h-7 rounded-full"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer - Total and Checkout */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(total)}
                </span>
              </div>
              <Button
                className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90"
                onClick={handleFinishOrder}
              >
                Finalizar Pedido
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FSWCartSheet;
