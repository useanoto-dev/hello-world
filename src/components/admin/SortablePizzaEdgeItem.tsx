import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Trash2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox as CheckboxUI } from "@/components/ui/checkbox";

// Custom drag handle icon (6 dots pattern)
const DragHandle = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 16 20" 
    fill="none" 
    className={className}
    style={{ width: 20, height: 20 }}
  >
    <circle cx="4" cy="4" r="1.5" fill="currentColor" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    <circle cx="4" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    <circle cx="4" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

export interface EdgePrice {
  sizeId: string;
  sizeName: string;
  enabled: boolean;
  price: string;
}

export interface PizzaEdge {
  id: string;
  title: string;
  isOut: boolean;
  prices: EdgePrice[];
}

interface SortablePizzaEdgeItemProps {
  edge: PizzaEdge;
  onUpdate: (id: string, field: keyof PizzaEdge, value: any) => void;
  onUpdatePrice: (edgeId: string, sizeId: string, field: "enabled" | "price", value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function SortablePizzaEdgeItem({
  edge,
  onUpdate,
  onUpdatePrice,
  onRemove,
  canRemove,
}: SortablePizzaEdgeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: edge.id });

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
    onUpdatePrice(edge.id, sizeId, "price", numericValue);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-[#fafafa] border border-[#e1e1e1] rounded-lg p-4 transition-all",
        isDragging && "opacity-50 shadow-lg z-50 ring-2 ring-[#f59e0b]"
      )}
    >
      {/* Header Row */}
      <div className="flex items-center gap-4 mb-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-[#d7d8dd] cursor-grab hover:text-[#9d9d9d] active:cursor-grabbing touch-none flex-shrink-0"
        >
          <DragHandle />
        </button>

        {/* Title Input */}
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-[#5a5a5a]">Título *</Label>
          <Input
            value={edge.title}
            onChange={(e) => onUpdate(edge.id, "title", e.target.value)}
            placeholder="Digite o título aqui"
            className="h-10 text-sm border-[#e1e1e1] bg-white"
          />
        </div>

        {/* Esgotar Switch */}
        <div className="flex flex-col items-center gap-1">
          <Label className="text-xs text-[#5a5a5a]">Esgotar</Label>
          <Switch
            checked={edge.isOut}
            onCheckedChange={(v) => onUpdate(edge.id, "isOut", v)}
            className="data-[state=checked]:bg-[#f59e0b]"
          />
        </div>

        {/* Remove button */}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(edge.id)}
            className="p-2 text-[#5a5a5a] hover:text-[#f15c3b] hover:bg-[#ffebe7] rounded flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Prices Section */}
      <div className="space-y-3">
        <Label className="text-xs text-[#5a5a5a] font-medium">Preços *</Label>
        <div className="flex flex-wrap gap-3">
          {edge.prices.map((priceItem) => (
            <div key={priceItem.sizeId} className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckboxUI
                  id={`${edge.id}-${priceItem.sizeId}`}
                  checked={priceItem.enabled}
                  onCheckedChange={(checked) => 
                    onUpdatePrice(edge.id, priceItem.sizeId, "enabled", !!checked)
                  }
                  className="data-[state=checked]:bg-[#009aff] data-[state=checked]:border-[#009aff] border-[#9d9d9d]"
                />
                <Label 
                  htmlFor={`${edge.id}-${priceItem.sizeId}`}
                  className="text-sm text-[#2b2b2b] uppercase"
                >
                  {priceItem.sizeName}
                </Label>
              </div>
              <div className="flex items-center h-10 border border-[#e1e1e1] rounded-md bg-white overflow-hidden">
                <input
                  type="text"
                  value={formatCurrency(priceItem.price)}
                  onChange={(e) => handlePriceChange(priceItem.sizeId, e.target.value)}
                  disabled={!priceItem.enabled}
                  placeholder="R$ 0,00"
                  className="w-24 px-3 text-sm h-full bg-transparent outline-none disabled:bg-[#f5f5f5] disabled:text-[#9d9d9d]"
                />
                <div className="h-full w-10 flex items-center justify-center border-l border-[#e1e1e1] bg-[#f5f5f5]">
                  <DollarSign className="w-4 h-4 text-[#5a5a5a]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
