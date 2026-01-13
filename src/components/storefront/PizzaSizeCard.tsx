import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface PizzaSize {
  id: string;
  name: string;
  description: string | null;
  slices: number;
  max_flavors: number;
  base_price: number;
  image_url: string | null;
}

interface PizzaSizeCardProps {
  size: PizzaSize;
  onClick: () => void;
  index: number;
}

// Badge variants para variedade visual
const getBadgeForSize = (index: number): { label: string; color: string } | null => {
  if (index === 1) return { label: "Popular", color: "bg-destructive text-white" };
  if (index === 5) return { label: "Gourmet", color: "bg-purple-500 text-white" };
  return null;
};

export function PizzaSizeCard({ size, onClick, index }: PizzaSizeCardProps) {
  const badge = getBadgeForSize(index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <button
        onClick={onClick}
        className="w-full text-left bg-white rounded-xl overflow-hidden border border-gray-200 transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group hover:shadow-lg hover:border-primary/30 active:scale-[0.98]"
      >
        {/* Image - Aspect 4/3 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <OptimizedImage
            src={size.image_url}
            alt={size.name}
            aspectRatio="auto"
            className="w-full h-full transition-transform duration-300 group-hover:scale-105"
            fallbackIcon={<span className="text-4xl">🍕</span>}
            priority={index < 6}
          />
          
          {/* Badge - Top Left */}
          {badge && (
            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold ${badge.color} shadow-sm`}>
              {badge.label}
            </div>
          )}
          
          {/* Flavors badge - Top Right */}
          {size.max_flavors > 1 && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded shadow-sm">
              Até {size.max_flavors} sabores
            </div>
          )}
        </div>

        {/* Info - Compact */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
            {size.name}
          </h3>
          
          {size.description && (
            <p className="text-gray-500 text-xs line-clamp-1 mt-1">
              {size.description}
            </p>
          )}
          
          {/* Price */}
          <div className="mt-2">
            <span className="text-xs text-gray-400">A partir de</span>
            <p className="text-sm font-bold text-primary">
              {formatCurrency(size.base_price)}
            </p>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
