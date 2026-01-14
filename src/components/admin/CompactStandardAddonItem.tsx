// Compact Standard Addon Item - For managing category add-ons
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface AddonPrice {
  sizeId: string;
  sizeName: string;
  enabled: boolean;
  price: string;
}

export interface StandardAddon {
  id: string;
  title: string;
  isOut: boolean;
  prices: AddonPrice[];
}

interface CompactStandardAddonItemProps {
  addon: StandardAddon;
  onUpdate: (id: string, field: keyof StandardAddon, value: any) => void;
  onUpdatePrice: (addonId: string, sizeId: string, field: "enabled" | "price", value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function CompactStandardAddonItem({ 
  addon, 
  onUpdate,
  onUpdatePrice,
  onRemove, 
  canRemove 
}: CompactStandardAddonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: addon.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseInt(numericValue || "0", 10) / 100;
    return number.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handlePriceChange = (sizeId: string, inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, "");
    onUpdatePrice(addon.id, sizeId, "price", numericValue);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 bg-white rounded-lg border border-[#e1e1e1] transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-[#9d9d9d] hover:text-[#5a5a5a] cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Title */}
        <Input
          value={addon.title}
          onChange={(e) => onUpdate(addon.id, "title", e.target.value)}
          placeholder="Nome do adicional"
          className="flex-1 h-9 text-sm border-[#e1e1e1] bg-white"
        />

        {/* Active Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9d9d9d]">Ativo</span>
          <Switch
            checked={!addon.isOut}
            onCheckedChange={(checked) => onUpdate(addon.id, "isOut", !checked)}
          />
        </div>

        {/* Remove Button */}
        {canRemove && (
          <button
            onClick={() => onRemove(addon.id)}
            className="text-red-400 hover:text-red-600 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Prices per Size */}
      {addon.prices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2 pl-7">
          {addon.prices.map((price) => (
            <div 
              key={price.sizeId}
              className={cn(
                "flex items-center gap-2 p-2 rounded border",
                price.enabled 
                  ? "border-[#e1e1e1] bg-white" 
                  : "border-gray-100 bg-gray-50 opacity-60"
              )}
            >
              <Checkbox
                checked={price.enabled}
                onCheckedChange={(checked) => 
                  onUpdatePrice(addon.id, price.sizeId, "enabled", !!checked)
                }
              />
              <span className="text-xs text-[#5a5a5a] truncate flex-1">
                {price.sizeName}
              </span>
              <Input
                value={formatCurrency(price.price)}
                onChange={(e) => handlePriceChange(price.sizeId, e.target.value)}
                disabled={!price.enabled}
                className="w-20 h-7 text-xs text-right font-mono border-[#e1e1e1]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
