// Pizza Size Grid - FSW Style List Layout (Image Left, Text Right)
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
      <div className="px-5 pb-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100">
            <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-1/3" />
            </div>
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
    <div className="px-5 pb-32 flex flex-col gap-3 font-storefront">
      {sizes.map((size, index) => (
        <motion.div
          key={size.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02, duration: 0.2 }}
        >
          <button
            onClick={() => onSizeSelect(size.id, size.name, size.max_flavors, size.base_price, size.image_url)}
            className="w-full flex gap-3 p-3 border border-border rounded-xl hover:bg-muted/50 transition-colors text-left"
          >
            {/* Image - Left side h-24 w-24 rounded-lg */}
            <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted shrink-0">
              <OptimizedImage
                src={size.image_url}
                alt={size.name}
                aspectRatio="auto"
                className="w-full h-full object-cover"
                fallbackIcon={<span className="text-2xl text-muted-foreground">🍕</span>}
                priority={index < 4}
              />
              
              {/* Flavors badge overlay */}
              {size.max_flavors > 1 && (
                <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  {size.max_flavors} sabores
                </div>
              )}
            </div>

            {/* Info - Right side */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground line-clamp-1">
                {size.name}
              </h3>
              
              {size.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {size.description}
                </p>
              )}
              
              {/* Slices info */}
              {size.slices > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {size.slices} fatias
                </p>
              )}
              
              {/* Price - FSW style: text-sm font-semibold text-primary */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">A partir de</span>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(size.base_price)}
                </span>
              </div>
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  );
}
