import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export interface OptionPrice {
  sizeId: string;
  sizeName: string;
  enabled: boolean;
  price: string;
}

export interface PizzaOption {
  id: string;
  title: string;
  isOut: boolean;
  prices: OptionPrice[];
}

interface CompactPizzaOptionItemProps {
  option: PizzaOption;
  onUpdate: (id: string, field: keyof PizzaOption, value: any) => void;
  onUpdatePrice: (optionId: string, sizeId: string, field: "enabled" | "price", value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  label?: string; // "borda", "massa", "adicional"
}

export function CompactPizzaOptionItem({
  option,
  onUpdate,
  onUpdatePrice,
  onRemove,
  canRemove,
}: CompactPizzaOptionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePriceChange = (sizeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const value = (parseInt(raw || '0') / 100).toFixed(2);
    onUpdatePrice(option.id, sizeId, "price", value);
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
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground cursor-grab hover:text-foreground active:cursor-grabbing touch-none flex-shrink-0 mt-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 space-y-2">
          {/* Header Row */}
          <div className="flex items-center gap-3">
            {/* Nome */}
            <div className="flex-1">
              <Input
                value={option.title}
                onChange={(e) => onUpdate(option.id, "title", e.target.value)}
                placeholder="Nome da opção"
                className="h-8 text-sm border-border bg-background"
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground">Ativo</span>
              <Switch
                checked={!option.isOut}
                onCheckedChange={(v) => onUpdate(option.id, "isOut", !v)}
                className="data-[state=checked]:bg-green-500 scale-90"
              />
            </div>

            {/* Remove */}
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemove(option.id)}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Prices Grid - Horizontal */}
          {option.prices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {option.prices.map((price) => (
                <div key={price.sizeId} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1">
                  <Checkbox
                    checked={price.enabled}
                    onCheckedChange={(checked) => onUpdatePrice(option.id, price.sizeId, "enabled", !!checked)}
                    className="h-3.5 w-3.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-xs text-muted-foreground truncate max-w-20">
                    {price.sizeName || "Tamanho"}
                  </span>
                  {price.enabled && (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formatCurrency(price.price)}
                        onChange={(e) => handlePriceChange(price.sizeId, e)}
                        className="h-7 w-20 text-sm border-border bg-background pl-6 text-right font-medium"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
