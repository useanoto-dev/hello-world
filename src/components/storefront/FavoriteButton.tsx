// Favorite button component
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({ 
  isFavorite, 
  onToggle, 
  className,
  size = "md" 
}: FavoriteButtonProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      whileTap={{ scale: 0.85 }}
      className={cn(
        "flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-colors",
        sizeClasses[size],
        className
      )}
    >
      <motion.div
        initial={false}
        animate={isFavorite ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart
          className={cn(
            iconSizes[size],
            "transition-colors",
            isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
          )}
        />
      </motion.div>
    </motion.button>
  );
}
