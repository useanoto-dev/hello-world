import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Minus, Plus, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PizzaSize {
  id: string;
  image: string | null;
  name: string;
  slices: number;
  flavors: number;
  priceModel: "sum" | "average" | "highest";
  isOut: boolean;
  basePrice: number;
}

interface CompactPizzaSizeItemProps {
  size: PizzaSize;
  onUpdate: (id: string, field: keyof PizzaSize, value: any) => void;
  onIncrement: (id: string, field: "slices" | "flavors") => void;
  onDecrement: (id: string, field: "slices" | "flavors") => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function CompactPizzaSizeItem({
  size,
  onUpdate,
  onIncrement,
  onDecrement,
  onRemove,
  canRemove,
}: CompactPizzaSizeItemProps) {
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
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const value = parseInt(raw || '0') / 100;
    onUpdate(size.id, "basePrice", value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg p-3 transition-all",
        isDragging && "opacity-50 shadow-lg z-50 ring-2 ring-primary"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground cursor-grab hover:text-foreground active:cursor-grabbing touch-none flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Nome */}
        <div className="flex-1 min-w-0">
          <Input
            value={size.name}
            onChange={(e) => onUpdate(size.id, "name", e.target.value)}
            placeholder="Nome do tamanho"
            className="h-8 text-sm border-border bg-background"
          />
        </div>

        {/* Preço Base */}
        <div className="w-28 flex-shrink-0">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              type="text"
              inputMode="decimal"
              value={formatCurrency(size.basePrice)}
              onChange={handlePriceChange}
              placeholder="0,00"
              className="h-9 text-sm border-border bg-background pl-8 text-right font-medium"
            />
          </div>
        </div>

        {/* Fatias - Compacto */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground w-10">Fatias</span>
          <div className="flex items-center h-8 border border-border rounded bg-background">
            <button 
              type="button"
              onClick={() => onDecrement(size.id, "slices")}
              disabled={size.slices <= 1}
              className="px-1.5 h-full text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center text-xs">{size.slices}</span>
            <button 
              type="button"
              onClick={() => onIncrement(size.id, "slices")}
              className="px-1.5 h-full text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Sabores - Compacto */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground w-12">Sabores</span>
          <div className="flex items-center h-8 border border-border rounded bg-background">
            <button 
              type="button"
              onClick={() => onDecrement(size.id, "flavors")}
              disabled={size.flavors <= 1}
              className="px-1.5 h-full text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center text-xs">{size.flavors}</span>
            <button 
              type="button"
              onClick={() => onIncrement(size.id, "flavors")}
              className="px-1.5 h-full text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Precificação */}
        <div className="w-28 flex-shrink-0">
          <Select 
            value={size.priceModel} 
            onValueChange={(v) => onUpdate(size.id, "priceModel", v)}
          >
            <SelectTrigger className="h-8 text-xs border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              <SelectItem value="sum" className="text-xs">Somatório</SelectItem>
              <SelectItem value="average" className="text-xs">Média</SelectItem>
              <SelectItem value="highest" className="text-xs">Maior Valor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ativo */}
        <div className="flex-shrink-0">
          <Switch
            checked={!size.isOut}
            onCheckedChange={(v) => onUpdate(size.id, "isOut", !v)}
            className="data-[state=checked]:bg-green-500 scale-90"
          />
        </div>

        {/* Remove */}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(size.id)}
            className="p-1.5 text-destructive hover:bg-destructive/10 rounded flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
