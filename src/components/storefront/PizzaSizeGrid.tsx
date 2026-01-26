// Pizza Size Grid - Anota AI Exact Style
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
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
      <div className="px-4 pb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start justify-between py-5 border-b border-gray-200">
            <div className="flex-1 space-y-2 pr-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="w-[88px] h-[88px] rounded-lg shrink-0" />
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
    <div className="px-4 pb-32 flex flex-col bg-white">
      {sizes.map((size, index) => (
        <button
          key={size.id}
          onClick={() => onSizeSelect(size.id, size.name, size.max_flavors, size.base_price, size.image_url)}
          className="w-full flex items-start justify-between py-5 border-b border-gray-200 hover:bg-gray-50/50 transition-colors text-left"
        >
          {/* Text Info - Left side */}
          <div className="flex-1 min-w-0 pr-4">
            {/* Title - Black, Bold */}
            <h3 className="font-bold text-gray-900 text-[15px] leading-tight">
              {size.name}
            </h3>
            
            {/* Description - Purple/Violet (slices info) */}
            {size.slices > 0 && (
              <p className="text-[13px] text-violet-500 mt-0.5">
                {size.slices} fatias
              </p>
            )}
            
            {/* Price - "A partir de" + price */}
            <p className="mt-1 text-[13px] text-gray-400">
              A partir de{' '}
              <span className="text-[15px] font-bold text-gray-900">
                {formatCurrency(size.base_price)}
              </span>
            </p>
          </div>

          {/* Image - Right side */}
          <div className="relative w-[88px] h-[88px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <OptimizedImage
              src={size.image_url}
              alt={size.name}
              aspectRatio="auto"
              className="w-full h-full object-cover"
              fallbackIcon={<span className="text-2xl text-gray-300">🍕</span>}
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
      ))}
    </div>
  );
}
