// Compact Standard Addon Item - For managing category add-ons
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface AddonPrice {
  sizeId: string;
  sizeName: string;
  price: number;
  enabled: boolean;
}

export interface StandardAddon {
  id: string;
  name: string;
  isActive: boolean;
  isRequired: boolean;
  maxQuantity: number;
  prices: AddonPrice[];
}

interface CompactStandardAddonItemProps {
  addon: StandardAddon;
  onUpdate: (id: string, field: keyof StandardAddon, value: any) => void;
  onPriceUpdate: (addonId: string, sizeId: string, field: "enabled" | "price", value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function CompactStandardAddonItem({ 
  addon, 
  onUpdate,
  onPriceUpdate,
  onRemove, 
  canRemove 
}: CompactStandardAddonItemProps) {
  const [expanded, setExpanded] = useState(false);
  
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handlePriceChange = (sizeId: string, inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, "");
    const price = parseInt(numericValue || "0", 10) / 100;
    onPriceUpdate(addon.id, sizeId, "price", price);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-lg border border-[#e1e1e1] transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-[#9d9d9d] hover:text-[#5a5a5a] cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Name */}
        <Input
          value={addon.name}
          onChange={(e) => onUpdate(addon.id, "name", e.target.value)}
          placeholder="Nome do complemento"
          className="flex-1 h-9 text-sm border-[#e1e1e1] bg-white"
        />

        {/* Active Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9d9d9d]">Ativo</span>
          <Switch
            checked={addon.isActive}
            onCheckedChange={(checked) => onUpdate(addon.id, "isActive", checked)}
          />
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#9d9d9d] hover:text-[#5a5a5a] p-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

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

      {/* Expanded: Prices per size */}
      {expanded && addon.prices.length > 0 && (
        <div className="px-3 pb-3 pt-0 border-t border-[#e1e1e1] mt-0">
          <p className="text-xs text-[#9d9d9d] mb-2 pt-2">Preços por tamanho:</p>
          <div className="space-y-2">
            {addon.prices.map((priceItem) => (
              <div key={priceItem.sizeId} className="flex items-center gap-3">
                <Checkbox
                  checked={priceItem.enabled}
                  onCheckedChange={(checked) => 
                    onPriceUpdate(addon.id, priceItem.sizeId, "enabled", !!checked)
                  }
                />
                <span className="text-sm text-[#5a5a5a] w-24">{priceItem.sizeName}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#9d9d9d]">R$</span>
                  <Input
                    value={formatCurrency(priceItem.price)}
                    onChange={(e) => handlePriceChange(priceItem.sizeId, e.target.value)}
                    disabled={!priceItem.enabled}
                    className="w-24 h-8 text-sm text-right font-mono border-[#e1e1e1] bg-white disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
