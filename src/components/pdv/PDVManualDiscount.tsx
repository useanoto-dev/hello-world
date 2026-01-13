import { useState } from "react";
import { Percent, DollarSign, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "@/lib/formatters";

export interface ManualDiscount {
  type: "fixed" | "percentage";
  value: number;
  discountAmount: number;
}

interface PDVManualDiscountProps {
  subtotal: number;
  discount: ManualDiscount | null;
  onDiscountChange: (discount: ManualDiscount | null) => void;
}

export function PDVManualDiscount({ 
  subtotal, 
  discount, 
  onDiscountChange 
}: PDVManualDiscountProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("percentage");
  const [inputValue, setInputValue] = useState("");

  const applyDiscount = () => {
    const value = parseFloat(inputValue.replace(",", "."));
    if (isNaN(value) || value <= 0) return;

    let discountAmount = 0;
    if (discountType === "percentage") {
      // Cap percentage at 100%
      const cappedPercentage = Math.min(value, 100);
      discountAmount = (subtotal * cappedPercentage) / 100;
    } else {
      // Cap fixed discount at subtotal
      discountAmount = Math.min(value, subtotal);
    }

    onDiscountChange({
      type: discountType,
      value: discountType === "percentage" ? Math.min(value, 100) : Math.min(value, subtotal),
      discountAmount: Math.round(discountAmount * 100) / 100,
    });
    setIsOpen(false);
    setInputValue("");
  };

  const removeDiscount = () => {
    onDiscountChange(null);
    setInputValue("");
    setIsOpen(false);
  };

  if (discount) {
    return (
      <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Desconto {discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)}
          </span>
          <span className="text-sm text-emerald-600">
            (-{formatCurrency(discount.discountAmount)})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
          onClick={removeDiscount}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Tag className="w-4 h-4" />
        Adicionar Desconto
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Desconto Manual</Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <ToggleGroup
        type="single"
        value={discountType}
        onValueChange={(value) => value && setDiscountType(value as "fixed" | "percentage")}
        className="justify-start"
      >
        <ToggleGroupItem value="percentage" className="gap-1.5">
          <Percent className="w-3 h-3" />
          Percentual
        </ToggleGroupItem>
        <ToggleGroupItem value="fixed" className="gap-1.5">
          <DollarSign className="w-3 h-3" />
          Valor Fixo
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            inputMode="decimal"
            placeholder={discountType === "percentage" ? "10" : "5,00"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {discountType === "percentage" ? "%" : "R$"}
          </span>
        </div>
        <Button onClick={applyDiscount} disabled={!inputValue}>
          Aplicar
        </Button>
      </div>

      {inputValue && (
        <p className="text-xs text-muted-foreground">
          Desconto: {formatCurrency(
            discountType === "percentage" 
              ? (subtotal * Math.min(parseFloat(inputValue.replace(",", ".")) || 0, 100)) / 100
              : Math.min(parseFloat(inputValue.replace(",", ".")) || 0, subtotal)
          )}
        </p>
      )}
    </div>
  );
}
