// Compact Standard Size Item - For managing standard category sizes
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface StandardSize {
  id: string;
  image: string | null;
  name: string;
  basePrice: number;
  isOut: boolean;
}

interface CompactStandardSizeItemProps {
  size: StandardSize;
  onUpdate: (id: string, field: keyof StandardSize, value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function CompactStandardSizeItem({ 
  size, 
  onUpdate, 
  onRemove, 
  canRemove 
}: CompactStandardSizeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: size.id });

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

  const handlePriceChange = (inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, "");
    const price = parseInt(numericValue || "0", 10) / 100;
    onUpdate(size.id, "basePrice", price);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e1e1e1] transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
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
        value={size.name}
        onChange={(e) => onUpdate(size.id, "name", e.target.value)}
        placeholder="Nome do tamanho"
        className="flex-1 h-9 text-sm border-[#e1e1e1] bg-white"
        data-size-input
      />

      {/* Base Price */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-[#9d9d9d]">R$</span>
        <Input
          value={formatCurrency(size.basePrice)}
          onChange={(e) => handlePriceChange(e.target.value)}
          className="w-24 h-9 text-sm text-right font-mono border-[#e1e1e1] bg-white"
        />
      </div>

      {/* Active Switch */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#9d9d9d]">Ativo</span>
        <Switch
          checked={!size.isOut}
          onCheckedChange={(checked) => onUpdate(size.id, "isOut", !checked)}
        />
      </div>

      {/* Remove Button */}
      {canRemove && (
        <button
          onClick={() => onRemove(size.id)}
          className="text-red-400 hover:text-red-600 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
