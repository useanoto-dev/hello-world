import { ShoppingCart, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface CartFloatingButtonProps {
  totalItems: number;
  storeSlug: string;
}

export default function CartFloatingButton({ totalItems, storeSlug }: CartFloatingButtonProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="max-w-lg mx-auto">
        <Link
          to={`/cardapio/${storeSlug}/carrinho`}
          className="flex items-center justify-between w-full bg-primary text-primary-foreground px-5 py-4 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-200 hover:scale-[1.02] group"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-foreground text-primary text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <span className="font-semibold text-base">Ver Carrinho</span>
          </div>
          
          <div className="flex items-center gap-1 text-primary-foreground/80 group-hover:text-primary-foreground transition-colors">
            <span className="text-sm font-medium">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
