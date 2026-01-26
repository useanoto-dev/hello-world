// Pizza Size Grid - Anota AI Style (Text Left, Image Right)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
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

interface PizzaSizeGridProps {
  categoryId: string;
  storeId: string;
  onSizeSelect: (sizeId: string, sizeName: string, maxFlavors: number, basePrice: number, imageUrl: string | null) => void;
}

async function fetchPizzaSizes(categoryId: string) {
  const { data, error } = await supabase
    .from("pizza_sizes")
    .select("*")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data || [];
}

export function PizzaSizeGrid({ categoryId, storeId, onSizeSelect }: PizzaSizeGridProps) {
  const { data: sizes, isLoading } = useQuery({
    queryKey: ["pizza-sizes", categoryId],
    queryFn: () => fetchPizzaSizes(categoryId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-4 pb-6 space-y-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start justify-between py-4 border-b border-gray-100">
            <div className="flex-1 space-y-2 pr-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="w-[100px] h-[100px] rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (!sizes || sizes.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-3">🍕</div>
        <p className="text-lg font-medium text-gray-900">Nenhum tamanho cadastrado</p>
        <p className="text-gray-500 text-sm">Os tamanhos de pizza aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-32 flex flex-col bg-white font-storefront">
      {sizes.map((size, index) => (
        <motion.div
          key={size.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02, duration: 0.2 }}
        >
          <button
            onClick={() => onSizeSelect(size.id, size.name, size.max_flavors, size.base_price, size.image_url)}
            className="w-full flex items-start justify-between py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors text-left"
          >
            {/* Text Info - Left side */}
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-semibold text-gray-900 text-[15px] leading-snug uppercase tracking-tight">
                {size.name}
              </h3>
              
              {/* Slices info */}
              {size.slices > 0 && (
                <p className="text-[13px] text-gray-500 mt-1">
                  {size.slices} fatias
                </p>
              )}
              
              {/* Price - Anota AI style */}
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[13px] text-gray-400">A partir de</span>
                <span className="text-[15px] font-bold text-emerald-600">
                  {formatCurrency(size.base_price)}
                </span>
              </div>
            </div>

            {/* Image - Right side */}
            <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-50">
              <OptimizedImage
                src={size.image_url}
                alt={size.name}
                aspectRatio="auto"
                className="w-full h-full object-cover"
                fallbackIcon={<span className="text-3xl text-gray-300">🍕</span>}
                priority={index < 4}
              />
              
              {/* Flavors badge overlay */}
              {size.max_flavors > 1 && (
                <div className="absolute bottom-1.5 left-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  {size.max_flavors} sabores
                </div>
              )}
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  );
}
