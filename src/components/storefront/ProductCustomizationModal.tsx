// Product Customization Modal - Dynamic option groups based on category configuration
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Minus, Plus, ChevronLeft, ChevronRight, Tag, Maximize2, Minimize2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

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
  item_layout: string; // "list" | "grid" | "grid-2" | "grid-3" | "grid-4"
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
  onClose: () => void;
  onComplete: () => void;
  onShowUpsell?: (categoryId: string) => void;
}

export default function ProductCustomizationModal({ product, category, storeId, preselectedOptionId, onClose, onComplete, onShowUpsell }: Props) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [items, setItems] = useState<Record<string, OptionItem[]>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [hasInitializedPreselection, setHasInitializedPreselection] = useState(false);
  const [manualDisplayMode, setManualDisplayMode] = useState<"modal" | "fullscreen" | null>(null);
  
  const { addToCart } = useCart();

  // Track the preselected group ID to filter it from sequential flow
  const [preselectedGroupId, setPreselectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadOptions();
  }, [category.id]);

  // Real-time subscription for option items updates (promotional prices)
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
          // Load products from this category as flavor options
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
        
        // If we have a preselected option, find its group and preselect it
        if (preselectedOptionId && !hasInitializedPreselection) {
          const preselectedItem = (itemsData || []).find((item: OptionItem) => item.id === preselectedOptionId);
          if (preselectedItem) {
            setSelections(prev => ({
              ...prev,
              [preselectedItem.group_id]: [preselectedOptionId]
            }));
            setHasInitializedPreselection(true);
            // Store the preselected group ID to filter it from sequential navigation
            setPreselectedGroupId(preselectedItem.group_id);
            // Start at step 0 since we'll filter out the preselected group
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

  // Helper to check if promotion is currently active
  const isPromotionActive = (item: OptionItem): boolean => {
    if (item.promotional_price === null || item.promotional_price >= item.additional_price) {
      return false;
    }
    const now = new Date();
    // Check start date
    if (item.promotion_start_at) {
      const startDate = new Date(item.promotion_start_at);
      if (now < startDate) return false;
    }
    // Check end date
    if (item.promotion_end_at) {
      const endDate = new Date(item.promotion_end_at);
      if (now > endDate) return false;
    }
    return true;
  };

  // Helper to get effective price for an option item
  const getItemEffectivePrice = (item: OptionItem): number => {
    if (isPromotionActive(item)) {
      return item.promotional_price!;
    }
    return item.additional_price;
  };

  // Calculate price breakdown for display
  const priceBreakdown = useMemo(() => {
    const breakdown: { label: string; price: number; originalPrice?: number }[] = [];
    
    // Add base price (primary option)
    if (basePrice > 0) {
      const primaryOptionName = preselectedOptionId 
        ? Object.values(items).flat().find(i => i.id === preselectedOptionId)?.name 
        : null;
      breakdown.push({
        label: primaryOptionName || product.name,
        price: basePrice,
        originalPrice: hasPromotion ? originalPrice ?? undefined : undefined
      });
    }
    
    // Add selected options
    Object.entries(selections).forEach(([groupId, selectedIds]) => {
      const groupItems = items[groupId] || [];
      selectedIds.forEach(itemId => {
        const item = groupItems.find(i => i.id === itemId);
        if (item) {
          // Skip the preselected primary option
          if (preselectedOptionId && itemId === preselectedOptionId) {
            return;
          }
          const qty = quantities[itemId] || 1;
          const effectivePrice = getItemEffectivePrice(item);
          if (effectivePrice > 0 || item.additional_price > 0) {
            const hasItemPromo = item.promotional_price !== null && item.promotional_price < item.additional_price;
            breakdown.push({
              label: qty > 1 ? `${item.name} (${qty}x)` : item.name,
              price: effectivePrice * qty,
              originalPrice: hasItemPromo ? item.additional_price * qty : undefined
            });
          }
        }
      });
    });
    
    return breakdown;
  }, [basePrice, selections, items, quantities, preselectedOptionId, product.name, hasPromotion, originalPrice]);

  const totalPrice = useMemo(() => {
    let total = basePrice;
    
    Object.entries(selections).forEach(([groupId, selectedIds]) => {
      const groupItems = items[groupId] || [];
      selectedIds.forEach(itemId => {
        const item = groupItems.find(i => i.id === itemId);
        if (item) {
          // Skip the preselected primary option - its price is already in basePrice
          if (preselectedOptionId && itemId === preselectedOptionId) {
            return;
          }
          const qty = quantities[itemId] || 1;
          total += getItemEffectivePrice(item) * qty;
        }
      });
    });
    
    return total;
  }, [basePrice, selections, items, quantities, preselectedOptionId]);

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
      // Check max selections
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
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [itemId]: newQty };
    });
  };

  // Filter out the preselected group for sequential navigation (user already selected via card)
  const sequentialGroups = useMemo(() => {
    if (preselectedGroupId && category.use_sequential_flow) {
      return groups.filter(g => g.id !== preselectedGroupId);
    }
    return groups;
  }, [groups, preselectedGroupId, category.use_sequential_flow]);

  const isGroupValid = (group: OptionGroup): boolean => {
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
  };

  const canProceed = (): boolean => {
    if (category.use_sequential_flow) {
      // Use sequentialGroups for validation in sequential flow
      if (sequentialGroups.length === 0) return false;
      const safeStep = Math.min(currentStep, sequentialGroups.length - 1);
      const group = sequentialGroups[safeStep];
      if (group) {
        return isGroupValid(group);
      }
    } else {
      return groups.every(isGroupValid);
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < sequentialGroups.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleAddToCart();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    // Build selection summary
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
      product_id: product.id, // ID original para dedução de estoque
      name: product.name,
      price: totalPrice,
      quantity: 1,
      category: category.name,
      description: selectedOptions.length > 0 ? selectedOptions.join(", ") : undefined,
      image_url: product.image_url || undefined,
    });

    toast.success("Adicionado ao carrinho!");
    
    // Show upsell modal instead of just closing
    if (onShowUpsell) {
      onShowUpsell(category.id);
    } else {
      onComplete();
    }
  };

  const renderGroup = (group: OptionGroup) => {
    const groupItems = items[group.id] || [];
    const showImages = group.show_item_images;
    const isGrid = group.item_layout !== 'list';
    
    // Responsive grid columns: mobile → tablet → desktop
    const gridCols = group.item_layout === 'grid-2' 
      ? 'grid-cols-2' 
      : group.item_layout === 'grid-4' 
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' 
        : 'grid-cols-2 sm:grid-cols-3'; // default to 2/3 cols for "grid", "grid-3"
    
    // Responsive image sizes: smaller on mobile, larger on desktop
    const gridImageSize = group.item_layout === 'grid-2' 
      ? 'w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20' 
      : group.item_layout === 'grid-4' 
        ? 'w-10 h-10 sm:w-12 sm:h-12' 
        : 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16';

    if (groupItems.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhuma opção disponível
        </div>
      );
    }

    if (group.selection_type === "single") {
      return (
        <RadioGroup
          value={selections[group.id]?.[0] || ""}
          onValueChange={(value) => handleSingleSelect(group.id, value)}
          className={isGrid ? `grid ${gridCols} gap-1.5 sm:gap-2` : "grid grid-cols-1 gap-1.5 sm:gap-2"}
        >
          {groupItems.map((item) => (
            <div
              key={item.id}
              className={`${isGrid ? 'flex flex-col items-center text-center p-2 sm:p-3' : 'flex items-center justify-between p-2 sm:p-3'} rounded-lg border transition-colors cursor-pointer ${
                selections[group.id]?.[0] === item.id 
                  ? "bg-primary/10 border-primary" 
                  : "bg-card hover:bg-accent/50"
              }`}
              onClick={() => handleSingleSelect(group.id, item.id)}
            >
              {isGrid ? (
                // Grid layout
                <>
                  <RadioGroupItem value={item.id} id={item.id} className="sr-only" />
                  {showImages && item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className={`${gridImageSize} rounded-md sm:rounded-lg object-cover mb-1 sm:mb-2`}
                    />
                  )}
                  <Label htmlFor={item.id} className="cursor-pointer text-center w-full">
                    <span className="font-medium text-xs sm:text-sm line-clamp-2 leading-tight">{item.name}</span>
                    {item.description && (
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-2 leading-tight">{item.description}</p>
                    )}
                    {isPromotionActive(item) && (
                      <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[9px] sm:text-[10px] font-bold mt-0.5 sm:mt-1">
                        <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        -{Math.round(((item.additional_price - item.promotional_price!) / item.additional_price) * 100)}%
                      </span>
                    )}
                  </Label>
                  {isPromotionActive(item) ? (
                    <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through">
                        +{formatCurrency(item.additional_price)}
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium text-green-600">
                        +{formatCurrency(item.promotional_price!)}
                      </span>
                    </div>
                  ) : item.additional_price > 0 ? (
                    <span className="text-[10px] sm:text-xs font-medium text-primary mt-0.5 sm:mt-1">
                      +{formatCurrency(item.additional_price)}
                    </span>
                  ) : null}
                </>
              ) : (
                // List layout
                <>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={item.id} id={item.id} />
                    {showImages && item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <Label htmlFor={item.id} className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {isPromotionActive(item) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[10px] font-bold">
                            <Tag className="w-2.5 h-2.5" />
                            -{Math.round(((item.additional_price - item.promotional_price!) / item.additional_price) * 100)}%
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </Label>
                  </div>
                  {isPromotionActive(item) ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground line-through">
                        +{formatCurrency(item.additional_price)}
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        +{formatCurrency(item.promotional_price!)}
                      </span>
                    </div>
                  ) : item.additional_price > 0 ? (
                    <span className="text-sm font-medium text-primary">
                      +{formatCurrency(item.additional_price)}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </RadioGroup>
      );
    }

    // Multiple selection
    const showImagesMultiple = group.show_item_images;
    return (
      <div className={isGrid ? `grid ${gridCols} gap-1.5 sm:gap-2` : "space-y-1.5 sm:space-y-2"}>
        {groupItems.map((item) => {
          const isSelected = (selections[group.id] || []).includes(item.id);
          const qty = quantities[item.id] || 1;
          
          return (
            <div
              key={item.id}
              className={`${isGrid ? 'flex flex-col items-center text-center p-2 sm:p-3' : 'flex items-center justify-between p-2 sm:p-3'} rounded-lg border transition-colors ${
                isSelected ? "bg-primary/10 border-primary" : "bg-card hover:bg-accent/50"
              }`}
            >
              {isGrid ? (
                // Grid layout for multiple selection
                <>
                  <Checkbox
                    id={item.id}
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      handleMultipleSelect(group.id, item.id, checked as boolean)
                    }
                    className="mb-2"
                  />
                  {showImagesMultiple && item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className={`${gridImageSize} rounded-md sm:rounded-lg object-cover mb-1 sm:mb-2`}
                    />
                  )}
                  <Label htmlFor={item.id} className="cursor-pointer text-center w-full">
                    <span className="font-medium text-xs sm:text-sm line-clamp-2 leading-tight">{item.name}</span>
                    {item.description && (
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-2 leading-tight">{item.description}</p>
                    )}
                    {isPromotionActive(item) && (
                      <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[9px] sm:text-[10px] font-bold mt-0.5 sm:mt-1">
                        <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        -{Math.round(((item.additional_price - item.promotional_price!) / item.additional_price) * 100)}%
                      </span>
                    )}
                  </Label>
                  {isSelected && (
                    <div className="flex items-center gap-0.5 sm:gap-1 mt-1.5 sm:mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        onClick={() => handleQuantityChange(item.id, -1)}
                      >
                        <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </Button>
                      <span className="w-4 sm:w-5 text-center text-[10px] sm:text-xs font-medium">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </Button>
                    </div>
                  )}
                  {isPromotionActive(item) ? (
                    <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through">
                        +{formatCurrency(item.additional_price * (isSelected ? qty : 1))}
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium text-green-600">
                        +{formatCurrency(item.promotional_price! * (isSelected ? qty : 1))}
                      </span>
                    </div>
                  ) : item.additional_price > 0 ? (
                    <span className="text-[10px] sm:text-xs font-medium text-primary mt-0.5 sm:mt-1">
                      +{formatCurrency(item.additional_price * (isSelected ? qty : 1))}
                    </span>
                  ) : null}
                </>
              ) : (
                // List layout for multiple selection
                <>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={item.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleMultipleSelect(group.id, item.id, checked as boolean)
                      }
                    />
                    {showImagesMultiple && item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <Label htmlFor={item.id} className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {isPromotionActive(item) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[10px] font-bold">
                            <Tag className="w-2.5 h-2.5" />
                            -{Math.round(((item.additional_price - item.promotional_price!) / item.additional_price) * 100)}%
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {isPromotionActive(item) ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground line-through">
                          +{formatCurrency(item.additional_price * (isSelected ? qty : 1))}
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          +{formatCurrency(item.promotional_price! * (isSelected ? qty : 1))}
                        </span>
                      </div>
                    ) : item.additional_price > 0 ? (
                      <span className="text-sm font-medium text-primary">
                        +{formatCurrency(item.additional_price * (isSelected ? qty : 1))}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Ensure currentStep is within bounds of the filtered sequential groups
  const safeCurrentStep = Math.min(currentStep, Math.max(0, sequentialGroups.length - 1));
  const currentGroup = category.use_sequential_flow && sequentialGroups.length > 0 ? sequentialGroups[safeCurrentStep] : null;
  const isLastStep = safeCurrentStep === sequentialGroups.length - 1;
  
  // Check if current group (sequential) or any group (all-at-once) uses fullscreen
  const defaultFullscreen = category.use_sequential_flow
    ? currentGroup?.display_mode === 'fullscreen'
    : groups.some(g => g.display_mode === 'fullscreen');
  
  // Manual override takes precedence
  const useFullscreen = manualDisplayMode !== null 
    ? manualDisplayMode === 'fullscreen' 
    : defaultFullscreen;

  const toggleDisplayMode = () => {
    setManualDisplayMode(prev => {
      if (prev === null) {
        // First toggle: switch from default
        return defaultFullscreen ? 'modal' : 'fullscreen';
      }
      // Subsequent toggles: just flip
      return prev === 'fullscreen' ? 'modal' : 'fullscreen';
    });
  };

  const headerContent = (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <span className="text-lg font-semibold">{product.name}</span>
        <p className="text-sm text-muted-foreground mt-1">
          {category.use_sequential_flow && sequentialGroups.length > 0 
            ? `Passo ${safeCurrentStep + 1} de ${sequentialGroups.length}`
            : "Personalize seu pedido"
          }
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleDisplayMode}
          className="text-muted-foreground hover:text-foreground"
          title={useFullscreen ? "Modo janela" : "Tela cheia"}
        >
          {useFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  // Keep showing loading state until preselection is fully initialized
  const isInitializing = loading || (preselectedOptionId && !preselectedGroupId);

  const bodyContent = (
    <>
      {isInitializing ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhuma opção de personalização disponível.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Preço: <strong>{formatCurrency(basePrice)}</strong>
          </p>
        </div>
      ) : category.use_sequential_flow && sequentialGroups.length === 0 ? (
        // All groups were preselected, just show add to cart
        <div className="text-center py-8">
          <p className="text-muted-foreground">Produto selecionado!</p>
        </div>
      ) : category.use_sequential_flow ? (
        // Sequential flow with slide animation
        <AnimatePresence mode="wait">
          {currentGroup ? (
            <motion.div 
              key={currentGroup.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{currentGroup.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentGroup.selection_type === "single" 
                    ? "Escolha uma opção"
                    : currentGroup.max_selections 
                      ? `Escolha até ${currentGroup.max_selections} opções`
                      : "Escolha quantas opções quiser"
                  }
                  {currentGroup.is_required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </p>
              </div>
              {renderGroup(currentGroup)}
            </motion.div>
          ) : (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        // All groups at once
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id}>
              <div className="mb-3">
                <h3 className="font-semibold">{group.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {group.selection_type === "single" 
                    ? "Escolha uma opção"
                    : group.max_selections 
                      ? `Escolha até ${group.max_selections} opções`
                      : "Escolha quantas opções quiser"
                  }
                  {group.is_required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </p>
              </div>
              {renderGroup(group)}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const footerContent = (
    <>
      {/* Price Breakdown */}
      {priceBreakdown.length > 0 && (
        <div className="mb-3 space-y-1">
          {priceBreakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate mr-2">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(item.originalPrice)}
                  </span>
                )}
                <span className={`font-medium whitespace-nowrap ${item.originalPrice ? 'text-green-600' : 'text-foreground'}`}>
                  {formatCurrency(item.price)}
                </span>
              </div>
            </div>
          ))}
          
          {/* Savings badge when there's any promotion */}
          {(() => {
            const totalSavings = priceBreakdown.reduce((acc, item) => {
              return acc + (item.originalPrice ? item.originalPrice - item.price : 0);
            }, 0);
            const totalOriginal = priceBreakdown.reduce((acc, item) => {
              return acc + (item.originalPrice || item.price);
            }, 0);
            
            if (totalSavings <= 0) return null;
            
            return (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between text-sm bg-green-500/10 rounded-lg px-2 py-1.5 mt-2"
              >
                <div className="flex items-center gap-1.5 text-green-600">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="font-medium">Economia</span>
                  <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    -{Math.round((totalSavings / totalOriginal) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground line-through text-xs">
                    {formatCurrency(totalOriginal)}
                  </span>
                  <span className="font-bold text-green-600">
                    -{formatCurrency(totalSavings)}
                  </span>
                </div>
              </motion.div>
            );
          })()}
          
          {priceBreakdown.length > 1 && (
            <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalPrice)}</span>
            </div>
          )}
          {priceBreakdown.length === 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalPrice)}</span>
            </div>
          )}
        </div>
      )}
      {priceBreakdown.length === 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      )}
      
      {category.use_sequential_flow && sequentialGroups.length > 0 ? (
        <div className="flex gap-2">
          {safeCurrentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          <Button 
            className="flex-1 gap-1" 
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {isLastStep ? (
              <>
                <Check className="w-4 h-4" />
                Adicionar ao Carrinho
              </>
            ) : (
              <>
                Continuar
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      ) : (
        <Button 
          className="w-full gap-2" 
          onClick={handleAddToCart}
          disabled={!canProceed()}
        >
          <Check className="w-4 h-4" />
          Adicionar ao Carrinho
        </Button>
      )}
    </>
  );

  // Fullscreen header for Base44 style
  const fullscreenHeaderContent = (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={category.use_sequential_flow && safeCurrentStep > 0 ? handleBack : onClose}
        className="rounded-lg w-8 h-8 shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <h2 className="text-lg font-bold text-foreground truncate">
        {category.use_sequential_flow && currentGroup 
          ? currentGroup.name 
          : product.name
        }
      </h2>
    </div>
  );

  // Don't render the modal until fully initialized (no skeleton flash)
  if (isInitializing) {
    return null;
  }

  // Animated container for mode transitions
  return (
    <AnimatePresence mode="wait">
      {useFullscreen ? (
        <Dialog key="fullscreen" open onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="max-w-full w-full h-[100dvh] max-h-[100dvh] p-0 rounded-none sm:rounded-none flex flex-col data-[state=open]:animate-none border-none">
            <DialogTitle className="sr-only">{product.name}</DialogTitle>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col h-full bg-background"
            >
              {/* Base44 style header */}
              <div className="px-4 py-3 border-b border-border shrink-0 bg-background sticky top-0 z-10">
                {fullscreenHeaderContent}
                {category.use_sequential_flow && sequentialGroups.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 ml-10">
                    Passo {safeCurrentStep + 1} de {sequentialGroups.length}
                  </p>
                )}
              </div>
              
              {/* Content area */}
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto px-4 py-4">
                  {isInitializing ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhuma opção de personalização disponível.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Preço: <strong>{formatCurrency(basePrice)}</strong>
                      </p>
                    </div>
                  ) : category.use_sequential_flow && sequentialGroups.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Produto selecionado!</p>
                    </div>
                  ) : category.use_sequential_flow ? (
                    currentGroup ? (
                      <div key={currentGroup.id}>
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">
                            {currentGroup.selection_type === "single" 
                              ? "Escolha uma opção"
                              : currentGroup.max_selections 
                                ? `Escolha até ${currentGroup.max_selections} opções`
                                : "Escolha quantas opções quiser"
                            }
                            {currentGroup.is_required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </p>
                        </div>
                        {renderGroup(currentGroup)}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    )
                  ) : (
                    <div className="space-y-6">
                      {groups.map((group) => (
                        <div key={group.id}>
                          <div className="mb-3">
                            <h3 className="font-semibold">{group.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {group.selection_type === "single" 
                                ? "Escolha uma opção"
                                : group.max_selections 
                                  ? `Escolha até ${group.max_selections} opções`
                                  : "Escolha quantas opções quiser"
                              }
                              {group.is_required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </p>
                          </div>
                          {renderGroup(group)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Fixed footer */}
              <div className="border-t border-border p-4 bg-background shrink-0 pb-safe">
                {footerContent}
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer key="modal" open onOpenChange={(open) => !open && onClose()}>
          <DrawerContent className="max-h-[90vh]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col"
            >
              <DrawerHeader className="border-b pb-4">
                {headerContent}
                <DrawerTitle className="sr-only">{product.name}</DrawerTitle>
              </DrawerHeader>

              <ScrollArea className="flex-1 max-h-[50vh]">
                <div className="p-4">
                  {bodyContent}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="border-t p-4 bg-background">
                {footerContent}
              </div>
            </motion.div>
          </DrawerContent>
        </Drawer>
      )}
    </AnimatePresence>
  );
}
