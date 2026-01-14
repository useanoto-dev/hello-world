// Standard Flavor Selection Drawer - Fullscreen drawer for products with display_mode='customization'
// Similar to PizzaFlavorSelectionDrawer but for standard products (açaí, hambúrguer, etc.)
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Minus, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/contexts/CartContext";

interface OptionGroup {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  display_order: number;
  item_layout: string;
  show_item_images: boolean;
}

interface OptionItem {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  additional_price: number;
  promotional_price: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_id: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product;
  storeId: string;
  categoryName: string;
}

async function fetchProductOptions(productId: string, storeId: string) {
  // Fetch groups from product_option_groups
  const { data: groupsData, error: groupsError } = await supabase
    .from("product_option_groups")
    .select("*")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("display_order");

  if (groupsError) throw groupsError;

  const groups = (groupsData || []) as OptionGroup[];

  if (groups.length === 0) return { groups: [], items: {} };

  // Fetch items for all groups
  const groupIds = groups.map(g => g.id);
  const { data: itemsData, error: itemsError } = await supabase
    .from("product_option_items")
    .select("*")
    .in("group_id", groupIds)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("display_order");

  if (itemsError) throw itemsError;

  // Group items by group_id
  const itemsByGroup: Record<string, OptionItem[]> = {};
  (itemsData || []).forEach((item: OptionItem) => {
    if (!itemsByGroup[item.group_id]) {
      itemsByGroup[item.group_id] = [];
    }
    itemsByGroup[item.group_id].push(item);
  });

  return { groups, items: itemsByGroup };
}

export function StandardFlavorSelectionDrawer({
  open,
  onClose,
  product,
  storeId,
  categoryName,
}: Props) {
  const { addToCart } = useCart();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["product-options", product.id, storeId],
    queryFn: () => fetchProductOptions(product.id, storeId),
    enabled: open,
  });

  const groups = data?.groups || [];
  const items = data?.items || {};

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setSelections({});
      setQuantities({});
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const basePrice = product.promotional_price ?? product.price;
  const hasPromo = product.promotional_price !== null && product.promotional_price < product.price;

  const getItemPrice = (item: OptionItem) => {
    if (item.promotional_price !== null && item.promotional_price < item.additional_price) {
      return item.promotional_price;
    }
    return item.additional_price;
  };

  const totalPrice = useMemo(() => {
    let total = basePrice;
    
    Object.entries(selections).forEach(([groupId, selectedIds]) => {
      const groupItems = items[groupId] || [];
      selectedIds.forEach(itemId => {
        const item = groupItems.find(i => i.id === itemId);
        if (item) {
          const qty = quantities[itemId] || 1;
          total += getItemPrice(item) * qty;
        }
      });
    });
    
    return total;
  }, [basePrice, selections, items, quantities]);

  const handleSingleSelect = (groupId: string, itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [groupId]: [itemId]
    }));
  };

  const handleMultipleSelect = (groupId: string, itemId: string, checked: boolean) => {
    const group = groups.find(g => g.id === groupId);
    const currentSelections = selections[groupId] || [];
    
    if (checked) {
      if (group?.max_selections && currentSelections.length >= group.max_selections) {
        toast.error(`Máximo de ${group.max_selections} seleções`);
        return;
      }
      setSelections(prev => ({
        ...prev,
        [groupId]: [...currentSelections, itemId]
      }));
      setQuantities(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      setSelections(prev => ({
        ...prev,
        [groupId]: currentSelections.filter(id => id !== itemId)
      }));
    }
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [itemId]: newQty };
    });
  };

  const isGroupValid = (group: OptionGroup): boolean => {
    const selected = selections[group.id] || [];
    if (group.is_required && selected.length === 0) return false;
    if (group.selection_type === "multiple" && group.min_selections && selected.length < group.min_selections) {
      return false;
    }
    return true;
  };

  const canAddToCart = () => {
    return groups.every(isGroupValid);
  };

  const handleAddToCart = () => {
    if (!canAddToCart()) {
      const invalidGroup = groups.find(g => !isGroupValid(g));
      if (invalidGroup) {
        toast.error(`Selecione ${invalidGroup.is_required ? "pelo menos" : ""} ${invalidGroup.min_selections || 1} opção em "${invalidGroup.name}"`);
        return;
      }
    }

    // Build description from selections
    const selectedOptions: string[] = [];
    groups.forEach(group => {
      const selectedIds = selections[group.id] || [];
      const groupItems = items[group.id] || [];
      
      selectedIds.forEach(itemId => {
        const item = groupItems.find(i => i.id === itemId);
        if (item) {
          const qty = quantities[itemId] || 1;
          if (qty > 1) {
            selectedOptions.push(`${item.name} (${qty}x)`);
          } else {
            selectedOptions.push(item.name);
          }
        }
      });
    });

    addToCart({
      id: `${product.id}-${Date.now()}`,
      product_id: product.id,
      name: product.name,
      price: totalPrice,
      quantity: 1,
      category: categoryName,
      description: selectedOptions.length > 0 ? selectedOptions.join(", ") : undefined,
      image_url: product.image_url || undefined,
    });

    toast.success("Adicionado ao carrinho!");
    onClose();
  };

  // Option Item Card
  const OptionCard = ({ item, group }: { item: OptionItem; group: OptionGroup }) => {
    const isSelected = (selections[group.id] || []).includes(item.id);
    const qty = quantities[item.id] || 1;
    const hasItemPromo = item.promotional_price !== null && item.promotional_price < item.additional_price;
    const showImages = group.show_item_images && item.image_url;

    return (
      <button
        onClick={() => {
          if (group.selection_type === "single") {
            handleSingleSelect(group.id, item.id);
          } else {
            handleMultipleSelect(group.id, item.id, !isSelected);
          }
        }}
        className={cn(
          "text-left w-full rounded-xl border transition-all duration-150",
          isSelected 
            ? "bg-amber-50 border-amber-400 shadow-sm" 
            : "bg-white border-gray-100 hover:border-gray-200"
        )}
      >
        <div className="p-3 flex gap-3">
          {/* Image */}
          {showImages && (
            <img 
              src={item.image_url!} 
              alt={item.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 leading-tight">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
              {isSelected && (
                <Check className="w-5 h-5 text-amber-500 flex-shrink-0" strokeWidth={2.5} />
              )}
            </div>
            
            {/* Price */}
            <div className="flex items-center gap-2 mt-1.5">
              {hasItemPromo ? (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    {formatCurrency(item.additional_price)}
                  </span>
                  <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {formatCurrency(item.promotional_price!)}
                  </span>
                </>
              ) : item.additional_price > 0 ? (
                <span className="text-sm font-medium text-amber-600">
                  + {formatCurrency(item.additional_price)}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Incluso</span>
              )}
            </div>

            {/* Quantity controls for multiple selection */}
            {isSelected && group.selection_type === "multiple" && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(item.id, -1);
                  }}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <span className="w-6 text-center text-sm font-medium">{qty}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(item.id, 1);
                  }}
                  className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center hover:bg-amber-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  if (!open) return null;

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gray-50 flex flex-col"
        >
          {/* Header */}
          <header className="flex-shrink-0 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
              <button 
                onClick={onClose} 
                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-base text-gray-900 truncate">{product.name}</h1>
                <p className="text-xs text-gray-500">Personalize seu pedido</p>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto pb-28">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhuma opção disponível</p>
                </div>
              ) : (
                groups.map((group) => {
                  const groupItems = items[group.id] || [];
                  const isValid = isGroupValid(group);
                  const selectedCount = (selections[group.id] || []).length;

                  return (
                    <section key={group.id}>
                      {/* Group Header */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-sm text-gray-900">{group.name}</h2>
                          {group.is_required && (
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              isValid 
                                ? "bg-green-100 text-green-700" 
                                : "bg-red-100 text-red-600"
                            )}>
                              Obrigatório
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.selection_type === "single" 
                            ? "Escolha uma opção" 
                            : `Escolha ${group.min_selections || 0} a ${group.max_selections || "∞"} opções`
                          }
                          {selectedCount > 0 && ` • ${selectedCount} selecionado(s)`}
                        </p>
                      </div>

                      {/* Items Grid/List */}
                      {groupItems.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-sm text-gray-400">Nenhuma opção disponível</p>
                        </div>
                      ) : (
                        <div className={cn(
                          group.item_layout === "grid-2" && "grid grid-cols-2 gap-2",
                          group.item_layout === "grid-3" && "grid grid-cols-2 sm:grid-cols-3 gap-2",
                          group.item_layout === "list" && "space-y-2"
                        )}>
                          {groupItems.map((item) => (
                            <OptionCard key={item.id} item={item} group={group} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>
          </main>

          {/* Footer */}
          <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4 shadow-lg z-10">
            <div className="max-w-2xl mx-auto">
              {/* Price Summary */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">{product.name}</p>
                  <div className="flex items-center gap-2">
                    {hasPromo && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(totalPrice)}</p>
                </div>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={!canAddToCart()}
                className={cn(
                  "w-full h-12 text-base font-semibold rounded-xl shadow-sm transition-all",
                  canAddToCart()
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Check className="w-5 h-5 mr-2" />
                Adicionar ao Carrinho
              </Button>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
