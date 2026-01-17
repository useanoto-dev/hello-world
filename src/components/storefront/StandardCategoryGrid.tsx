// Standard Category Product Grid - Display standard_items for standard categories
// Unified UI with PizzaSizeCard style
import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Crown, Plus, Minus } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "./FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";

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

// Badge variants for visual variety (matching PizzaSizeCard)
const getBadgeForIndex = (index: number): { label: string; color: string } | null => {
  if (index === 1) return { label: "Popular", color: "bg-destructive text-white" };
  if (index === 5) return { label: "Especial", color: "bg-purple-500 text-white" };
  return null;
};

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

  const displayMode = propDisplayMode ?? categorySettings?.display_mode ?? "cards";
  const allowQuantitySelector = propAllowQuantity ?? categorySettings?.allow_quantity_selector ?? true;

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

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] || 1) + delta)
    }));
  };

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
      <div className="px-3 sm:px-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className={displayMode === "list" ? "space-y-3" : "grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className={displayMode === "list" ? "h-24 rounded-xl" : "aspect-[4/3] rounded-xl"} />
          ))}
        </div>
      </div>
    );
  }

  // If no items, show sizes as the selectable products
  if (!items || items.length === 0) {
    if (sizes && sizes.length > 0) {
      return (
        <div className="px-3 sm:px-4 pb-6">
          <div className={displayMode === "list" ? "space-y-3" : "grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"}>
            {sizes.map((size, index) => {
              const badge = getBadgeForIndex(index);
              const quantity = getQuantity(size.id);
              
              if (displayMode === "list") {
                return (
                  <motion.div
                    key={size.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <div className="flex items-center gap-3 bg-card rounded-xl overflow-hidden border border-border p-3 hover:shadow-md transition-shadow">
                      {/* Image */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                        <OptimizedImage
                          src={size.image_url}
                          alt={size.name}
                          aspectRatio="auto"
                          className="w-full h-full"
                          fallbackIcon={<span className="text-2xl opacity-50">🍽️</span>}
                        />
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm line-clamp-1">{size.name}</h3>
                        {size.description && (
                          <p className="text-muted-foreground text-xs line-clamp-2 mt-0.5">{size.description}</p>
                        )}
                        <p className="text-sm font-bold text-primary mt-1">
                          {formatCurrency(size.base_price)}
                        </p>
                      </div>

                      {/* Quantity & Add */}
                      <div className="flex items-center gap-2">
                        {allowQuantitySelector && (
                          <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => { e.stopPropagation(); updateQuantity(size.id, -1); }}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => { e.stopPropagation(); updateQuantity(size.id, 1); }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => onItemSelect({ 
                            id: size.id, 
                            name: size.name, 
                            description: size.description,
                            image_url: size.image_url,
                            item_type: 'standard',
                            is_premium: false 
                          }, size, size.base_price, allowQuantitySelector ? quantity : 1)}
                          className="h-9 px-4"
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // Card mode (matching PizzaSizeCard exactly)
              return (
                <motion.div
                  key={size.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                >
                  <button
                    onClick={() => onItemSelect({ 
                      id: size.id, 
                      name: size.name, 
                      description: size.description,
                      image_url: size.image_url,
                      item_type: 'standard',
                      is_premium: false 
                    }, size, size.base_price, allowQuantitySelector ? quantity : 1)}
                    className="w-full text-left bg-card rounded-xl overflow-hidden border border-border transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group hover:shadow-lg hover:border-primary/30 active:scale-[0.98]"
                  >
                    {/* Image - Aspect 4/3 */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <OptimizedImage
                        src={size.image_url}
                        alt={size.name}
                        aspectRatio="auto"
                        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                        fallbackIcon={<span className="text-4xl">🍽️</span>}
                        priority={index < 6}
                      />
                      
                      {/* Badge - Top Left */}
                      {badge && (
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold ${badge.color} shadow-sm`}>
                          {badge.label}
                        </div>
                      )}

                      {/* Favorite button - Top Right */}
                      {showFavorites && (
                        <div className="absolute top-2 right-2 z-10">
                          <FavoriteButton
                            isFavorite={isFavorite(size.id)}
                            onToggle={() => toggleFavorite(size.id)}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Info - Compact */}
                    <div className="p-3">
                      <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                        {size.name}
                      </h3>
                      
                      {size.description && (
                        <p className="text-muted-foreground text-xs line-clamp-1 mt-1">
                          {size.description}
                        </p>
                      )}
                      
                      {/* Price */}
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">A partir de</span>
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(size.base_price)}
                        </p>
                      </div>

                      {/* Quantity selector */}
                      {allowQuantitySelector && (
                        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(size.id, -1); }}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(size.id, 1); }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-3">🍽️</div>
        <p className="text-lg font-medium text-foreground">Nenhum item cadastrado</p>
        <p className="text-muted-foreground text-sm">Os itens aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 pb-6 space-y-4">
      {/* Size selector */}
      {sizes && sizes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4 scrollbar-hide">
          {sizes.map(size => (
            <button
              key={size.id}
              onClick={() => setSelectedSizeId(size.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                effectiveSize === size.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
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

      {/* Items grid/list */}
      <div className={displayMode === "list" ? "space-y-3" : "grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"}>
        {items.map((item, index) => {
          const selectedSize = sizes?.find(s => s.id === effectiveSize);
          const itemPrice = priceMap.get(item.id)?.get(effectiveSize || '');
          const displayPrice = itemPrice !== undefined ? itemPrice : selectedSize?.base_price || 0;
          const badge = getBadgeForIndex(index);
          const quantity = getQuantity(item.id);

          if (displayMode === "list") {
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                <div className="flex items-center gap-3 bg-card rounded-xl overflow-hidden border border-border p-3 hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    <OptimizedImage
                      src={item.image_url}
                      alt={item.name}
                      aspectRatio="auto"
                      className="w-full h-full"
                      fallbackIcon={<span className="text-2xl opacity-50">🍽️</span>}
                    />
                    {item.is_premium && (
                      <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                        <Crown className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-muted-foreground text-xs line-clamp-2 mt-0.5">{item.description}</p>
                    )}
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(displayPrice)}
                    </p>
                  </div>

                  {/* Quantity & Add */}
                  <div className="flex items-center gap-2">
                    {allowQuantitySelector && (
                      <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleItemClick(item)}
                      className="h-9 px-4"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          }

          // Card mode (matching PizzaSizeCard exactly)
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
            >
              <button
                onClick={() => handleItemClick(item)}
                className="w-full text-left bg-card rounded-xl overflow-hidden border border-border transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group hover:shadow-lg hover:border-primary/30 active:scale-[0.98]"
              >
                {/* Image - Aspect 4/3 */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <OptimizedImage
                    src={item.image_url}
                    alt={item.name}
                    aspectRatio="auto"
                    className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                    fallbackIcon={<span className="text-4xl opacity-50">🍽️</span>}
                    priority={index < 6}
                  />

                  {/* Badge - Top Left */}
                  {badge && (
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold ${badge.color} shadow-sm`}>
                      {badge.label}
                    </div>
                  )}

                  {/* Premium badge */}
                  {item.is_premium && !badge && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white shadow-sm">
                      <Crown className="w-3 h-3" />
                      Premium
                    </div>
                  )}

                  {/* Favorite button - Top Right */}
                  {showFavorites && (
                    <div className="absolute top-2 right-2 z-10">
                      <FavoriteButton
                        isFavorite={isFavorite(item.id)}
                        onToggle={() => toggleFavorite(item.id)}
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                {/* Info - Compact */}
                <div className="p-3">
                  <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                    {item.name}
                  </h3>
                  
                  {item.description && (
                    <p className="text-muted-foreground text-xs line-clamp-1 mt-1">
                      {item.description}
                    </p>
                  )}
                  
                  {/* Price */}
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">A partir de</span>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(displayPrice)}
                    </p>
                  </div>

                  {/* Quantity selector */}
                  {allowQuantitySelector && (
                    <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}