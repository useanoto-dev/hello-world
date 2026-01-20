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
      className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
    >
      <Link
        to={`/cardapio/${storeSlug}/carrinho`}
        className="w-full h-14 flex items-center justify-between px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <span className="font-semibold">Ver carrinho</span>
        </div>
        <span className="font-bold">{formatPrice(totalPrice)}</span>
      </Link>
    </motion.div>
  );
}
