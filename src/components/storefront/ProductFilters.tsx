import { Tag, ChevronDown, ArrowUpDown, Flame } from "lucide-react";
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
}: ProductFiltersProps) {
  // Only show the promo filter if there are promos
  if (promoCount === 0) return null;

  return (
    <div className="px-3 sm:px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
      {/* Promo Filter Button */}
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
    </div>
  );
}
