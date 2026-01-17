// Advanced search filters component
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, Check, SlidersHorizontal, Heart, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/formatters";

export type PriceFilter = "all" | "under20" | "20to40" | "over40" | "custom";
export type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

interface AdvancedFiltersProps {
  priceFilter: PriceFilter;
  onPriceChange: (filter: PriceFilter) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  showPromoOnly: boolean;
  onPromoChange: (show: boolean) => void;
  showFavoritesOnly: boolean;
  onFavoritesChange: (show: boolean) => void;
  promoCount: number;
  favoritesCount: number;
  customPriceRange?: [number, number];
  onCustomPriceRange?: (range: [number, number]) => void;
  maxPrice?: number;
}

export function AdvancedFilters({
  priceFilter,
  onPriceChange,
  sortOption,
  onSortChange,
  showPromoOnly,
  onPromoChange,
  showFavoritesOnly,
  onFavoritesChange,
  promoCount,
  favoritesCount,
  customPriceRange = [0, 100],
  onCustomPriceRange,
  maxPrice = 100,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState(customPriceRange);

  const activeFiltersCount = [
    showPromoOnly,
    showFavoritesOnly,
    priceFilter !== "all",
    sortOption !== "default",
  ].filter(Boolean).length;

  const handleApplyFilters = useCallback(() => {
    if (onCustomPriceRange && priceFilter === "custom") {
      onCustomPriceRange(localPriceRange);
    }
    setIsOpen(false);
  }, [localPriceRange, onCustomPriceRange, priceFilter]);

  const handleResetFilters = useCallback(() => {
    onPriceChange("all");
    onSortChange("default");
    onPromoChange(false);
    onFavoritesChange(false);
    setLocalPriceRange([0, maxPrice]);
  }, [onPriceChange, onSortChange, onPromoChange, onFavoritesChange, maxPrice]);

  return (
    <div className="px-4 py-2">
      {/* Quick filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* Promos chip */}
        {promoCount > 0 && (
          <button
            onClick={() => onPromoChange(!showPromoOnly)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showPromoOnly
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Promoções ({promoCount})
          </button>
        )}

        {/* Favorites chip */}
        {favoritesCount > 0 && (
          <button
            onClick={() => onFavoritesChange(!showFavoritesOnly)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showFavoritesOnly
                ? 'bg-red-500 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Favoritos ({favoritesCount})
          </button>
        )}

        {/* More filters drawer */}
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="border-b">
              <div className="flex items-center justify-between">
                <DrawerTitle>Filtros e Ordenação</DrawerTitle>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    Limpar
                  </Button>
                )}
              </div>
            </DrawerHeader>
            
            <div className="p-4 space-y-6">
              {/* Price filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Faixa de Preço</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "all", label: "Todos" },
                    { value: "under20", label: "Até R$ 20" },
                    { value: "20to40", label: "R$ 20 - R$ 40" },
                    { value: "over40", label: "Acima de R$ 40" },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => onPriceChange(option.value as PriceFilter)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        priceFilter === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort options */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Ordenar por</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "default", label: "Padrão" },
                    { value: "price_asc", label: "Menor preço" },
                    { value: "price_desc", label: "Maior preço" },
                    { value: "name_asc", label: "A-Z" },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => onSortChange(option.value as SortOption)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sortOption === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Apenas promoções</Label>
                  <Switch 
                    checked={showPromoOnly} 
                    onCheckedChange={onPromoChange}
                  />
                </div>
                
                {favoritesCount > 0 && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Apenas favoritos</Label>
                    <Switch 
                      checked={showFavoritesOnly} 
                      onCheckedChange={onFavoritesChange}
                    />
                  </div>
                )}
              </div>

              <Button onClick={handleApplyFilters} className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

export default AdvancedFilters;
