import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PizzaSizeCard } from "./PizzaSizeCard";
import { Skeleton } from "@/components/ui/skeleton";

interface PizzaSizeGridProps {
  categoryId: string;
  storeId: string;
  onSizeSelect: (sizeId: string, sizeName: string, maxFlavors: number, basePrice: number) => void;
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
      <div className="px-3 sm:px-4 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200">
              <Skeleton className="aspect-[4/3]" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
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
    <div className="px-3 sm:px-4 pb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {sizes.map((size, index) => (
          <PizzaSizeCard
            key={size.id}
            size={size}
            index={index}
            onClick={() => onSizeSelect(size.id, size.name, size.max_flavors, size.base_price)}
          />
        ))}
      </div>
    </div>
  );
}
