// Product Customization Modal - Fullscreen style like Pizza Flavor Selection
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Minus, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
  use_sequential_flow: boolean;
}

interface OptionGroup {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  display_order: number;
  show_item_images: boolean;
  display_mode: "modal" | "fullscreen";
  item_layout: string;
}

interface OptionItem {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  additional_price: number;
  promotional_price: number | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
}

interface Props {
  product: Product;
  category: Category;
  storeId: string;
  preselectedOptionId?: string | null;
  allowOptionItemQuantity?: boolean;
  onClose: () => void;
  onComplete: () => void;
  onShowUpsell?: (categoryId: string) => void;
}

export default function ProductCustomizationModal({
  product,
  category,
  storeId,
  preselectedOptionId,
  allowOptionItemQuantity = true,
  onClose,
  onComplete,
  onShowUpsell,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [items, setItems] = useState<Record<string, OptionItem[]>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [hasInitializedPreselection, setHasInitializedPreselection] = useState(false);
  const [preselectedGroupId, setPreselectedGroupId] = useState<string | null>(null);
  
  const { addToCart } = useCart();

  useEffect(() => {
    loadOptions();
  }, [category.id]);

  // Block body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Real-time subscription for option items updates
  useEffect(() => {
    const channel = supabase
      .channel('option-items-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'category_option_items'
        },
        (payload) => {
          const updatedItem = payload.new as OptionItem;
          setItems(prev => {
            const newItems = { ...prev };
            Object.keys(newItems).forEach(groupId => {
              newItems[groupId] = newItems[groupId].map(item =>
                item.id === updatedItem.id ? { ...item, ...updatedItem } : item
              );
            });
            return newItems;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from("category_option_groups")
        .select("id, name, selection_type, is_required, min_selections, max_selections, display_order, is_primary, show_item_images, display_mode, item_layout")
        .eq("category_id", category.id)
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("display_order");

      if (groupsError) throw groupsError;
      
      const loadedGroups = (groupsData || []) as (OptionGroup & { is_primary: boolean })[];
      setGroups(loadedGroups);

      if (loadedGroups.length > 0) {
        const groupIds = loadedGroups.map(g => g.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from("category_option_items")
          .select("id, group_id, name, description, image_url, additional_price, promotional_price, promotion_start_at, promotion_end_at")
          .in("group_id", groupIds)
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("display_order");

        if (itemsError) throw itemsError;

        const itemsByGroup: Record<string, OptionItem[]> = {};
        (itemsData || []).forEach((item: OptionItem) => {
          if (!itemsByGroup[item.group_id]) {
            itemsByGroup[item.group_id] = [];
          }
          itemsByGroup[item.group_id].push(item);
        });

        // Check if there's a "Sabor" group without items - load products as items
        const saborGroup = loadedGroups.find(g => g.name === "Sabor" && !g.is_primary);
        if (saborGroup && (!itemsByGroup[saborGroup.id] || itemsByGroup[saborGroup.id].length === 0)) {
          const { data: productsData } = await supabase
            .from("products")
            .select("id, name, description, image_url, price, promotional_price")
            .eq("category_id", category.id)
            .eq("store_id", storeId)
            .eq("is_available", true)
            .order("display_order");

          if (productsData && productsData.length > 0) {
            itemsByGroup[saborGroup.id] = productsData.map(prod => ({
              id: `product-${prod.id}`,
              group_id: saborGroup.id,
              name: prod.name,
              description: prod.description,
              image_url: prod.image_url,
              additional_price: prod.price,
              promotional_price: prod.promotional_price,
              promotion_start_at: null,
              promotion_end_at: null,
            }));
          }
        }

        setItems(itemsByGroup);
        
        if (preselectedOptionId && !hasInitializedPreselection) {
          const preselectedItem = (itemsData || []).find((item: OptionItem) => item.id === preselectedOptionId);
          if (preselectedItem) {
            setSelections(prev => ({
              ...prev,
              [preselectedItem.group_id]: [preselectedOptionId]
            }));
            setHasInitializedPreselection(true);
            setPreselectedGroupId(preselectedItem.group_id);
            setCurrentStep(0);
          }
        }
      }
    } catch (error) {
      console.error("Error loading options:", error);
      toast.error("Erro ao carregar opções");
    } finally {
      setLoading(false);
    }
  };

  const basePrice = product.promotional_price ?? product.price;
  const originalPrice = product.promotional_price ? product.price : null;
  const hasPromotion = product.promotional_price !== null && product.promotional_price < product.price;

  const isPromotionActive = (item: OptionItem): boolean => {
    if (item.promotional_price === null || item.promotional_price >= item.additional_price) {
      return false;
    }
    const now = new Date();
    if (item.promotion_start_at) {
      const startDate = new Date(item.promotion_start_at);
      if (now < startDate) return false;
    }
    if (item.promotion_end_at) {
      const endDate = new Date(item.promotion_end_at);
      if (now > endDate) return false;
    }
    return true;
  };

  const getItemEffectivePrice = (item: OptionItem): number => {
    if (isPromotionActive(item)) {
      return item.promotional_price!;
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
          if (preselectedOptionId && itemId === preselectedOptionId) {
            return;
          }
          const qty = allowOptionItemQuantity ? (quantities[itemId] || 1) : 1;
          total += getItemEffectivePrice(item) * qty;
        }
      });
    });
    
    return total;
  }, [basePrice, selections, items, quantities, allowOptionItemQuantity, preselectedOptionId]);

  const handleSingleSelect = useCallback((groupId: string, itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [groupId]: [itemId]
    }));
  }, []);

  const handleMultipleSelect = useCallback((groupId: string, itemId: string, checked: boolean) => {
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
      setQuantities(prev => ({
        ...prev,
        [itemId]: 1
      }));
    } else {
      setSelections(prev => ({
        ...prev,
        [groupId]: currentSelections.filter(id => id !== itemId)
      }));
    }
  }, [groups, selections]);

  const handleQuantityChange = useCallback((itemId: string, delta: number) => {
    if (!allowOptionItemQuantity) return;
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [itemId]: newQty };
    });
  }, [allowOptionItemQuantity]);

  const sequentialGroups = useMemo(() => {
    if (preselectedGroupId && category.use_sequential_flow) {
      return groups.filter(g => g.id !== preselectedGroupId);
    }
    return groups;
  }, [groups, preselectedGroupId, category.use_sequential_flow]);

  const isGroupValid = useCallback((group: OptionGroup): boolean => {
    const selected = selections[group.id] || [];
    
    if (group.is_required && selected.length === 0) {
      return false;
    }
    
    if (group.selection_type === "multiple") {
      if (group.min_selections && selected.length < group.min_selections) {
        return false;
      }
    }
    
    return true;
  }, [selections]);

  const canProceed = useMemo((): boolean => {
    if (category.use_sequential_flow) {
      if (sequentialGroups.length === 0) return true;
      const safeStep = Math.min(currentStep, sequentialGroups.length - 1);
      const group = sequentialGroups[safeStep];
      if (group) {
        return isGroupValid(group);
      }
    } else {
      return groups.every(isGroupValid);
    }
    return true;
  }, [category.use_sequential_flow, sequentialGroups, currentStep, groups, isGroupValid]);

  const handleNext = useCallback(() => {
    if (category.use_sequential_flow && currentStep < sequentialGroups.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleAddToCart();
    }
  }, [currentStep, sequentialGroups.length, category.use_sequential_flow]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onClose();
    }
  }, [currentStep, onClose]);

  const handleAddToCart = useCallback(() => {
    const selectedOptions: string[] = [];
    
    groups.forEach(group => {
      const selectedIds = selections[group.id] || [];
      const groupItems = items[group.id] || [];
      
      selectedIds.forEach(itemId => {
        const item = groupItems.find(i => i.id === itemId);
        if (item) {
          const qty = allowOptionItemQuantity ? (quantities[itemId] || 1) : 1;
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
      category: category.name,
      description: selectedOptions.length > 0 ? selectedOptions.join(", ") : undefined,
      image_url: product.image_url || undefined,
    });

    toast.success("Adicionado ao carrinho!");
    
    if (onShowUpsell) {
      onShowUpsell(category.id);
    } else {
      onComplete();
    }
  }, [groups, selections, items, quantities, allowOptionItemQuantity, addToCart, product, totalPrice, category, onShowUpsell, onComplete]);

  // Card component for items - same style as pizza flavors
  const ItemCard = ({ item, group }: { item: OptionItem; group: OptionGroup }) => {
    const isSelected = (selections[group.id] || []).includes(item.id);
    const qty = allowOptionItemQuantity ? (quantities[item.id] || 1) : 1;
    const effectivePrice = getItemEffectivePrice(item);
    const hasItemPromo = isPromotionActive(item);
    
    const handleClick = () => {
      if (group.selection_type === "single") {
        handleSingleSelect(group.id, item.id);
      } else {
        handleMultipleSelect(group.id, item.id, !isSelected);
      }
    };

    return (
      <button
        onClick={handleClick}
        className={cn(
          "text-left px-3 py-2 rounded-lg border transition-all duration-150 w-full",
          isSelected 
            ? "bg-amber-50 border-amber-300" 
            : "bg-white border-gray-100 hover:border-gray-200"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[12px] text-gray-900 leading-tight">{item.name}</p>
              {hasItemPromo && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[9px] font-bold">
                  <Tag className="w-2 h-2" />
                  -{Math.round(((item.additional_price - item.promotional_price!) / item.additional_price) * 100)}%
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-[10px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
                {item.description}
              </p>
            )}
            {effectivePrice > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {hasItemPromo && (
                  <span className="text-[10px] text-gray-400 line-through">
                    +{formatCurrency(item.additional_price)}
                  </span>
                )}
                <span className={cn(
                  "text-[10px] font-semibold",
                  hasItemPromo ? "text-green-600" : "text-red-500"
                )}>
                  +{formatCurrency(effectivePrice)}
                </span>
              </div>
            )}
            
            {/* Quantity controls for multiple selection */}
            {isSelected && allowOptionItemQuantity && group.selection_type === "multiple" && (
              <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-5 w-5 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(item.id, -1);
                  }}
                >
                  <Minus className="w-2.5 h-2.5" />
                </Button>
                <span className="w-5 text-center text-[11px] font-medium">{qty}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-5 w-5 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(item.id, 1);
                  }}
                >
                  <Plus className="w-2.5 h-2.5" />
                </Button>
              </div>
            )}
          </div>
          {isSelected && (
            <Check className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          )}
        </div>
      </button>
    );
  };

  const safeCurrentStep = Math.min(currentStep, Math.max(0, sequentialGroups.length - 1));
  const currentGroup = category.use_sequential_flow && sequentialGroups.length > 0 
    ? sequentialGroups[safeCurrentStep] 
    : null;
  const isLastStep = safeCurrentStep === sequentialGroups.length - 1;

  // Total selections count for button
  const totalSelections = useMemo(() => {
    return Object.values(selections).reduce((sum, arr) => sum + arr.length, 0);
  }, [selections]);

  const isInitializing = loading || (preselectedOptionId && !preselectedGroupId && groups.length === 0);

  if (isInitializing) {
    return null;
  }

  // Render groups for "all at once" mode
  const renderAllGroups = () => (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupItems = items[group.id] || [];
        if (groupItems.length === 0) return null;
        
        return (
          <section key={group.id}>
            <h3 className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <span>📦</span> {group.name}
              {group.is_required && <span className="text-red-500">*</span>}
              <span className="text-gray-400 font-normal ml-1">
                {group.selection_type === "single" 
                  ? "(escolha 1)"
                  : group.max_selections 
                    ? `(até ${group.max_selections})`
                    : "(ilimitado)"
                }
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
              {groupItems.map(item => (
                <ItemCard key={item.id} item={item} group={group} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );

  // Render sequential mode
  const renderSequentialGroup = () => {
    if (!currentGroup) return null;
    const groupItems = items[currentGroup.id] || [];
    
    return (
      <motion.section
        key={currentGroup.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="bg-amber-50 border border-amber-100 rounded-xl py-2 px-4 text-center mb-4">
          <p className="text-[11px] font-medium text-gray-600">
            {currentGroup.selection_type === "single" 
              ? "Escolha 1 opção"
              : currentGroup.max_selections 
                ? `Escolha até ${currentGroup.max_selections} opções`
                : "Escolha quantas opções quiser"
            }
            {currentGroup.is_required && " (obrigatório)"}
          </p>
        </div>
        
        {groupItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-1">📦</p>
            <p className="text-[11px] text-gray-400">Nenhuma opção disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {groupItems.map(item => (
              <ItemCard key={item.id} item={item} group={currentGroup} />
            ))}
          </div>
        )}
      </motion.section>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gray-50 flex flex-col"
      >
        {/* Header - Same style as Pizza Flavor */}
        <header className="flex-shrink-0 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 h-11 flex items-center gap-2">
            <button 
              onClick={handleBack} 
              className="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-[13px] text-gray-900">
                {category.use_sequential_flow && currentGroup 
                  ? currentGroup.name 
                  : product.name
                }
              </span>
              {category.use_sequential_flow && sequentialGroups.length > 0 && (
                <span className="text-[11px] text-gray-400 ml-2">
                  Passo {safeCurrentStep + 1} de {sequentialGroups.length}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="max-w-5xl mx-auto px-4 py-3 space-y-4">
            {/* Product info banner */}
            {!category.use_sequential_flow && (
              <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-gray-900">{product.name}</p>
                  {product.description && (
                    <p className="text-[11px] text-gray-400 line-clamp-1">{product.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {hasPromotion && (
                      <span className="text-[11px] text-gray-400 line-through">
                        {formatCurrency(originalPrice!)}
                      </span>
                    )}
                    <span className={cn(
                      "text-[12px] font-bold",
                      hasPromotion ? "text-green-600" : "text-red-500"
                    )}>
                      {formatCurrency(basePrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {groups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-1">📦</p>
                <p className="text-[11px] text-gray-400">Nenhuma personalização disponível</p>
                <p className="text-[13px] font-semibold text-gray-700 mt-2">
                  {formatCurrency(basePrice)}
                </p>
              </div>
            ) : category.use_sequential_flow && sequentialGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-1">✅</p>
                <p className="text-[11px] text-gray-400">Produto selecionado!</p>
              </div>
            ) : category.use_sequential_flow ? (
              <AnimatePresence mode="wait">
                {renderSequentialGroup()}
              </AnimatePresence>
            ) : (
              renderAllGroups()
            )}
          </div>
        </main>

        {/* Footer - Same style as Pizza Flavor */}
        <AnimatePresence>
          {(canProceed || groups.length === 0) && (
            <motion.footer
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-3 z-10"
            >
              <div className="max-w-5xl mx-auto">
                {/* Price summary */}
                <div className="flex items-center justify-between mb-2 text-[12px]">
                  <span className="text-gray-500">Total</span>
                  <div className="flex items-center gap-2">
                    {hasPromotion && (
                      <span className="text-gray-400 line-through text-[11px]">
                        {formatCurrency(originalPrice!)}
                      </span>
                    )}
                    <span className="font-bold text-[15px] text-gray-900">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>
                
                <Button
                  onClick={handleNext}
                  disabled={!canProceed && groups.length > 0}
                  className="w-full h-10 text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-sm disabled:opacity-50"
                >
                  {category.use_sequential_flow && !isLastStep && sequentialGroups.length > 0 ? (
                    <>Continuar</>
                  ) : (
                    <>
                      Adicionar ao Carrinho
                      {totalSelections > 0 && ` (${totalSelections} ${totalSelections === 1 ? 'item' : 'itens'})`}
                    </>
                  )}
                </Button>
              </div>
            </motion.footer>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
