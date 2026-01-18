// Additionals Upsell Modal - Shows category option items (adicionais) for a category
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AdditionalItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  group_name: string;
}

interface SelectedAdditional {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AdditionalsUpsellModalProps {
  storeId: string;
  categoryId: string;
  title?: string;
  description?: string;
  buttonText?: string;
  secondaryButtonText?: string;
  icon?: string;
  maxItems?: number;
  onClose: () => void;
  onSelectAdditionals: (additionals: SelectedAdditional[]) => void;
}

async function fetchAdditionals(storeId: string, categoryId: string) {
  // First get groups that have "adiciona" or similar names (additionals groups)
  const { data: groups, error: groupsError } = await supabase
    .from("category_option_groups")
    .select("id, name")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .eq("is_primary", false) // Not primary (size/flavor)
    .order("display_order");

  if (groupsError) throw groupsError;
  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map(g => g.id);
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  // Get items from these groups
  const { data: items, error: itemsError } = await supabase
    .from("category_option_items")
    .select("id, name, description, additional_price, image_url, group_id")
    .in("group_id", groupIds)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("display_order");

  if (itemsError) throw itemsError;

  return (items || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.additional_price || 0,
    image_url: item.image_url,
    group_name: groupMap.get(item.group_id) || "Adicionais",
  }));
}

export default function AdditionalsUpsellModal({
  storeId,
  categoryId,
  title = "Deseja adicionar algo?",
  description,
  buttonText = "Confirmar",
  secondaryButtonText = "Não, obrigado",
  icon = "➕",
  maxItems = 10,
  onClose,
  onSelectAdditionals,
}: AdditionalsUpsellModalProps) {
  const [loading, setLoading] = useState(true);
  const [additionals, setAdditionals] = useState<AdditionalItem[]>([]);
  const [selected, setSelected] = useState<Map<string, SelectedAdditional>>(new Map());

  useEffect(() => {
    loadAdditionals();
  }, [storeId, categoryId]);

  const loadAdditionals = async () => {
    try {
      const data = await fetchAdditionals(storeId, categoryId);
      setAdditionals(data);
      
      // Auto-close if no additionals available
      if (data.length === 0) {
        onSelectAdditionals([]);
      }
    } catch (error) {
      console.error("Error loading additionals:", error);
      onSelectAdditionals([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (item: AdditionalItem) => {
    setSelected(prev => {
      const newMap = new Map(prev);
      if (newMap.has(item.id)) {
        newMap.delete(item.id);
      } else {
        newMap.set(item.id, {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        });
      }
      return newMap;
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setSelected(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;
      
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        newMap.delete(itemId);
      } else if (newQty <= maxItems) {
        newMap.set(itemId, { ...current, quantity: newQty });
      }
      return newMap;
    });
  };

  const handleConfirm = () => {
    onSelectAdditionals(Array.from(selected.values()));
  };

  const handleSkip = () => {
    onSelectAdditionals([]);
  };

  const totalSelected = Array.from(selected.values()).reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = Array.from(selected.values()).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Don't render if loading or no additionals
  if (loading) {
    return null;
  }

  if (additionals.length === 0) {
    return null;
  }

  // Group items by group_name
  const groupedAdditionals = additionals.reduce((acc, item) => {
    if (!acc[item.group_name]) {
      acc[item.group_name] = [];
    }
    acc[item.group_name].push(item);
    return acc;
  }, {} as Record<string, AdditionalItem[]>);

  return (
    <AnimatePresence>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={handleSkip}
      />
      
      {/* Bottom sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2 flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div className="flex-1">
            <h2 className="font-semibold text-base text-foreground">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {totalSelected > 0 && (
            <div className="px-2 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
              {totalSelected} item{totalSelected > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-4 pb-3">
          {Object.entries(groupedAdditionals).map(([groupName, items]) => (
            <div key={groupName} className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {groupName}
              </h3>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const selectedItem = selected.get(item.id);
                  const isSelected = !!selectedItem;
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl transition-all border",
                        isSelected
                          ? "bg-muted/50 border-primary/50"
                          : "bg-card border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <button
                        onClick={() => !isSelected && toggleItem(item)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                            ➕
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-medium text-[15px] text-gray-800 block truncate">{item.name}</span>
                          {item.price > 0 && (
                            <span className="text-sm font-normal text-gray-500">
                              +{formatCurrency(item.price)}
                            </span>
                          )}
                        </div>
                      </button>
                      
                      {isSelected ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-sm">
                            {selectedItem.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleItem(item)}
                          className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            onClick={handleConfirm}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {buttonText}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full h-10 text-sm"
          >
            {secondaryButtonText}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
