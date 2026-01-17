// Standard Category Product Grid - Display standard_items for standard categories
import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Tag, Star, Crown } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "./FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";

interface StandardItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  item_type: string;
  is_premium: boolean;
}

interface StandardSize {
  id: string;
  name: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
}

interface StandardItemPrice {
  item_id: string;
  size_id: string;
  price: number;
  is_available: boolean;
}

interface StandardCategoryGridProps {
  categoryId: string;
  storeId: string;
  onItemSelect: (item: StandardItem, size: StandardSize, price: number) => void;
  showFavorites?: boolean;
}

export function StandardCategoryGrid({
  categoryId,
  storeId,
  onItemSelect,
  showFavorites = true,
}: StandardCategoryGridProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites(storeId);

  // Fetch sizes for this category
  const { data: sizes, isLoading: sizesLoading } = useQuery({
    queryKey: ["standard-sizes", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("standard_sizes")
        .select("id, name, base_price, description, image_url")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw error;
      return data as StandardSize[];
    },
    enabled: !!categoryId,
  });

  // Fetch items for this category
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["standard-items", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("standard_items")
        .select("id, name, description, image_url, item_type, is_premium")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw error;
      return data as StandardItem[];
    },
    enabled: !!categoryId,
  });

  // Fetch prices
  const { data: prices } = useQuery({
    queryKey: ["standard-item-prices", categoryId],
    queryFn: async () => {
      if (!items || items.length === 0) return [];
      
      const itemIds = items.map(i => i.id);
      const { data, error } = await supabase
        .from("standard_item_prices")
        .select("item_id, size_id, price, is_available")
        .in("item_id", itemIds)
        .eq("is_available", true);
      
      if (error) throw error;
      return data as StandardItemPrice[];
    },
    enabled: !!items && items.length > 0,
  });

  // Build price map
  const priceMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    (prices || []).forEach(p => {
      if (!map.has(p.item_id)) {
        map.set(p.item_id, new Map());
      }
      map.get(p.item_id)!.set(p.size_id, p.price);
    });
    return map;
  }, [prices]);

  // Auto-select first size
  const effectiveSize = selectedSizeId || sizes?.[0]?.id || null;

  const handleItemClick = useCallback((item: StandardItem) => {
    const size = sizes?.find(s => s.id === effectiveSize);
    if (!size) return;

    const itemPrice = priceMap.get(item.id)?.get(size.id);
    const price = itemPrice !== undefined ? itemPrice : size.base_price;
    
    onItemSelect(item, size, price);
  }, [sizes, effectiveSize, priceMap, onItemSelect]);

  const isLoading = sizesLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="px-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    // If no items, show sizes as the selectable products
    if (sizes && sizes.length > 0) {
      return (
        <div className="px-4 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {sizes.map((size, index) => (
              <motion.div
                key={size.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <button
                  onClick={() => onItemSelect({ 
                    id: size.id, 
                    name: size.name, 
                    description: size.description,
                    image_url: size.image_url,
                    item_type: 'standard',
                    is_premium: false 
                  }, size, size.base_price)}
                  className="w-full text-left bg-white rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-lg hover:border-primary/30 group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <OptimizedImage
                      src={size.image_url}
                      alt={size.name}
                      aspectRatio="auto"
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                      fallbackIcon={<span className="text-4xl opacity-50">🍽️</span>}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{size.name}</h3>
                    {size.description && (
                      <p className="text-gray-500 text-xs line-clamp-1 mt-1">{size.description}</p>
                    )}
                    <div className="mt-2">
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(size.base_price)}
                      </span>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Nenhum item disponível</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 space-y-4">
      {/* Size selector */}
      {sizes && sizes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {sizes.map(size => (
            <button
              key={size.id}
              onClick={() => setSelectedSizeId(size.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                effectiveSize === size.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {size.name}
              <span className="ml-1 text-xs opacity-75">
                {formatCurrency(size.base_price)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Items grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item, index) => {
          const selectedSize = sizes?.find(s => s.id === effectiveSize);
          const itemPrice = priceMap.get(item.id)?.get(effectiveSize || '');
          const displayPrice = itemPrice !== undefined ? itemPrice : selectedSize?.base_price || 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <button
                onClick={() => handleItemClick(item)}
                className="w-full text-left bg-white rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-lg hover:border-primary/30 group"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <OptimizedImage
                    src={item.image_url}
                    alt={item.name}
                    aspectRatio="auto"
                    className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                    fallbackIcon={<span className="text-4xl opacity-50">🍽️</span>}
                  />

                  {/* Favorite button */}
                  {showFavorites && (
                    <div className="absolute top-2 right-2 z-10">
                      <FavoriteButton
                        isFavorite={isFavorite(item.id)}
                        onToggle={() => toggleFavorite(item.id)}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Premium badge */}
                  {item.is_premium && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white shadow-sm">
                      <Crown className="w-3 h-3" />
                      Premium
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                    {item.name}
                  </h3>
                  
                  {item.description && (
                    <p className="text-gray-500 text-xs line-clamp-1 mt-1">{item.description}</p>
                  )}
                  
                  <div className="mt-2">
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(displayPrice)}
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
