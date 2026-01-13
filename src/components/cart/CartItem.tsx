import React from "react";
import { Plus, Minus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem as CartItemType } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onEdit?: (item: CartItemType) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove, onEdit }: CartItemProps) {
  const itemTotalPrice = item.price * item.quantity;
  const isPizza = item.category === 'pizzas';

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex gap-3">
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
        {item.quantity}x
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground text-sm line-clamp-2">
          {item.name}
        </h4>
        
        {item.flavors && item.flavors.length > 0 && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground">Sabores:</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.flavors.map((flavor, index) => (
                <span key={index} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {flavor.name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {item.extras?.specialSurcharges && item.extras.specialSurcharges.length > 0 && (
          <div className="mt-1">
            {item.extras.specialSurcharges.map((surcharge, index) => (
              <p key={index} className="text-xs text-amber-600">
                {surcharge}
              </p>
            ))}
          </div>
        )}

        {item.extras?.border && item.extras.border.id !== 'sem_borda' && (
          <p className="text-xs text-muted-foreground mt-1">
            + Borda: {item.extras.border.name.replace('Borda ', '')}
          </p>
        )}

        {item.extras?.toppings && item.extras.toppings.length > 0 && (
          <div className="mt-1">
            {item.extras.toppings.map((topping, index) => (
              <p key={index} className="text-xs text-muted-foreground">
                + Cobertura: {topping.name}
              </p>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 p-0"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
          
          {/* Botão Editar para pizzas */}
          {isPizza && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              className="w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-0 ml-1"
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            className="w-6 h-6 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive p-0 ml-1"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-bold text-foreground text-sm">
          {formatCurrency(itemTotalPrice)}
        </p>
      </div>
    </div>
  );
}
