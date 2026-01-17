import { Tag, ChevronDown, ArrowUpDown, Flame, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type PriceFilter = "all" | "under20" | "20to40" | "over40";
export type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

interface ProductFiltersProps {
  priceFilter: PriceFilter;
  onPriceChange: (filter: PriceFilter) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  showPromoOnly: boolean;
  onPromoChange: (show: boolean) => void;
  promoCount?: number;
  showFavoritesOnly?: boolean;
  onFavoritesChange?: (show: boolean) => void;
  favoritesCount?: number;
}

const priceLabels: Record<PriceFilter, string> = {
  all: "Todos os preços",
  under20: "Até R$ 20",
  "20to40": "R$ 20 - R$ 40",
  over40: "Acima de R$ 40",
};

const sortLabels: Record<SortOption, string> = {
  default: "Ordenar",
  price_asc: "Menor preço",
  price_desc: "Maior preço",
  name_asc: "A-Z",
  name_desc: "Z-A",
};

export default function ProductFilters({
  priceFilter,
  onPriceChange,
  sortOption,
  onSortChange,
  showPromoOnly,
  onPromoChange,
  promoCount = 0,
  showFavoritesOnly = false,
  onFavoritesChange,
  favoritesCount = 0,
}: ProductFiltersProps) {
  // Show if there are promos or favorites
  if (promoCount === 0 && favoritesCount === 0) return null;

  return (
    <div className="px-3 sm:px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
      {/* Promo Filter Button */}
      {promoCount > 0 && (
        <Button
          variant={showPromoOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onPromoChange(!showPromoOnly)}
          className={`flex-shrink-0 gap-1.5 ${
            showPromoOnly 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "border-green-500/50 text-green-600 hover:bg-green-500/10"
          }`}
        >
          <Flame className="w-4 h-4" />
          Promoções
          <Badge 
            variant="secondary" 
            className={`ml-1 px-1.5 py-0 text-xs ${
              showPromoOnly 
                ? "bg-white/20 text-white" 
                : "bg-green-500/20 text-green-600"
            }`}
          >
            {promoCount}
          </Badge>
        </Button>
      )}

      {/* Favorites Filter Button */}
      {favoritesCount > 0 && onFavoritesChange && (
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onFavoritesChange(!showFavoritesOnly)}
          className={`flex-shrink-0 gap-1.5 ${
            showFavoritesOnly 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "border-red-500/50 text-red-500 hover:bg-red-500/10"
          }`}
        >
          <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          Favoritos
          <Badge 
            variant="secondary" 
            className={`ml-1 px-1.5 py-0 text-xs ${
              showFavoritesOnly 
                ? "bg-white/20 text-white" 
                : "bg-red-500/20 text-red-500"
            }`}
          >
            {favoritesCount}
          </Badge>
        </Button>
      )}

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex-shrink-0 gap-1.5">
            <ArrowUpDown className="w-4 h-4" />
            {sortLabels[sortOption]}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-white z-50">
          {Object.entries(sortLabels).map(([key, label]) => (
            <DropdownMenuItem 
              key={key}
              onClick={() => onSortChange(key as SortOption)}
              className={sortOption === key ? "bg-primary/10" : ""}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
