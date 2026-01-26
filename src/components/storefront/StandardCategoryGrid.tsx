// Standard Category Product Grid - Anota AI Exact Style
import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Crown } from "lucide-react";
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

interface CategorySettings {
  display_mode?: "cards" | "list";
  allow_quantity_selector?: boolean;
}

interface StandardCategoryGridProps {
  categoryId: string;
  storeId: string;
  onItemSelect: (item: StandardItem, size: StandardSize, price: number, quantity?: number) => void;
  showFavorites?: boolean;
  displayMode?: "cards" | "list";
  allowQuantitySelector?: boolean;
}

export function StandardCategoryGrid({
  categoryId,
  storeId,
  onItemSelect,
  showFavorites = true,
  displayMode: propDisplayMode,
  allowQuantitySelector: propAllowQuantity,
}: StandardCategoryGridProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { isFavorite, toggleFavorite } = useFavorites(storeId);

  // Fetch category settings
  const { data: categorySettings } = useQuery({
    queryKey: ["category-settings", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("display_mode, allow_quantity_selector")
        .eq("id", categoryId)
        .single();
      
      if (error) throw error;
      return data as CategorySettings;
    },
    enabled: !!categoryId,
  });

  const allowQuantitySelector = propAllowQuantity !== undefined ? propAllowQuantity : (categorySettings?.allow_quantity_selector !== false);

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

  const getQuantity = (itemId: string) => quantities[itemId] || 1;

  const handleItemClick = useCallback((item: StandardItem) => {
    const size = sizes?.find(s => s.id === effectiveSize);
    if (!size) return;

    const itemPrice = priceMap.get(item.id)?.get(size.id);
    const price = itemPrice !== undefined ? itemPrice : size.base_price;
    const quantity = allowQuantitySelector ? getQuantity(item.id) : 1;
    
    onItemSelect(item, size, price, quantity);
    // Reset quantity after adding
    if (allowQuantitySelector) {
      setQuantities(prev => ({ ...prev, [item.id]: 1 }));
    }
  }, [sizes, effectiveSize, priceMap, onItemSelect, allowQuantitySelector, quantities]);

  const isLoading = sizesLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="px-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-start justify-between py-5 border-b border-gray-200">
            <div className="flex-1 space-y-2 pr-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="w-[88px] h-[88px] rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  // If no items, show sizes as the selectable products
  if (!items || items.length === 0) {
    if (sizes && sizes.length > 0) {
      return (
        <div className="px-4 pb-32 flex flex-col bg-white">
          {sizes.map((size, index) => {
            const quantity = getQuantity(size.id);
            
            return (
              <button
                key={size.id}
                onClick={() => onItemSelect({ 
                  id: size.id, 
                  name: size.name, 
                  description: size.description,
                  image_url: size.image_url,
                  item_type: 'standard',
                  is_premium: false 
                }, size, size.base_price, allowQuantitySelector ? quantity : 1)}
                className="w-full flex items-start justify-between py-5 border-b border-gray-200 hover:bg-gray-50/50 transition-colors text-left"
              >
                {/* Text Info - Left side */}
                <div className="flex-1 min-w-0 pr-4">
                  {/* Title - Black, Bold */}
                  <h3 className="font-bold text-gray-900 text-[15px] leading-tight">
                    {size.name}
                  </h3>
                  {/* Description - Purple/Violet */}
                  {size.description && (
                    <p className="text-[13px] text-violet-500 mt-0.5 line-clamp-2">
                      {size.description}
                    </p>
                  )}
                  {/* Price - Black Bold */}
                  <p className="mt-1 text-[15px] font-bold text-gray-900">
                    {formatCurrency(size.base_price)}
                  </p>
                </div>

                {/* Image - Right side */}
                <div className="relative w-[88px] h-[88px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <OptimizedImage
                    src={size.image_url}
                    alt={size.name}
                    aspectRatio="auto"
                    className="w-full h-full object-cover"
                    fallbackIcon={<span className="text-2xl text-gray-300">🍽️</span>}
                  />
                </div>
              </button>
            );
          })}
        </div>
      );
    }
    
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-3">🍽️</div>
        <p className="text-lg font-medium text-gray-900">Nenhum item cadastrado</p>
        <p className="text-gray-500 text-sm">Os itens aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-32 space-y-4 bg-white">
      {/* Size selector */}
      {sizes && sizes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {sizes.map(size => (
            <button
              key={size.id}
              onClick={() => setSelectedSizeId(size.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                effectiveSize === size.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

      {/* Items list - Anota AI exact style */}
      <div className="flex flex-col">
        {items.map((item, index) => {
          const selectedSize = sizes?.find(s => s.id === effectiveSize);
          const itemPrice = priceMap.get(item.id)?.get(effectiveSize || '');
          const displayPrice = itemPrice !== undefined ? itemPrice : selectedSize?.base_price || 0;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="w-full flex items-start justify-between py-5 border-b border-gray-200 hover:bg-gray-50/50 transition-colors text-left"
            >
              {/* Text Info - Left side */}
              <div className="flex-1 min-w-0 pr-4">
                {/* Title - Black, Bold */}
                <h3 className="font-bold text-gray-900 text-[15px] leading-tight">
                  {item.name}
                  {item.is_premium && (
                    <Crown className="w-3.5 h-3.5 inline-block ml-1.5 text-amber-500" />
                  )}
                </h3>
                
                {/* Description - Purple/Violet */}
                {item.description && (
                  <p className="text-[13px] text-violet-500 mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                {/* Price - Black Bold */}
                <p className="mt-1 text-[15px] font-bold text-gray-900">
                  {formatCurrency(displayPrice)}
                </p>
                
                {/* Favorite Button - below price */}
                {showFavorites && (
                  <div onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }} className="mt-2">
                    <FavoriteButton
                      isFavorite={isFavorite(item.id)}
                      onToggle={() => {}}
                      size="sm"
                    />
                  </div>
                )}
              </div>

              {/* Image - Right side */}
              <div className="relative w-[88px] h-[88px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <OptimizedImage
                  src={item.image_url}
                  alt={item.name}
                  aspectRatio="auto"
                  className="w-full h-full object-cover"
                  fallbackIcon={<span className="text-2xl text-gray-300">🍽️</span>}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}