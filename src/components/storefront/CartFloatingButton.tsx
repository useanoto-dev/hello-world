import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

interface CartFloatingButtonProps {
  totalItems: number;
  storeSlug: string;
}

export default function CartFloatingButton({ totalItems, storeSlug }: CartFloatingButtonProps) {
  const { totalPrice } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (totalItems === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-primary font-storefront"
    >
      <Link
        to={`/cardapio/${storeSlug}/carrinho`}
        className="w-full h-14 flex items-center justify-between px-6"
      >
        <div className="flex items-center gap-3">
          {/* Badge - bg-primary-foreground text-primary rounded-full h-8 w-8 */}
          <div className="relative flex items-center justify-center h-8 w-8 bg-primary-foreground text-primary rounded-full text-sm font-bold">
            {totalItems}
          </div>
          <span className="font-bold text-primary-foreground">Ver sacola</span>
        </div>
        <span className="font-bold text-primary-foreground">{formatPrice(totalPrice)}</span>
      </Link>
    </motion.div>
  );
}
