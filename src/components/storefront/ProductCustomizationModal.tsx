// Product Customization Modal - Exact style as reference images
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Share2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
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
      
      // Expand first group by default
      if (loadedGroups.length > 0) {
        setExpandedGroups(new Set([loadedGroups[0].id]));
      }

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

  const handleItemSelect = useCallback((groupId: string, itemId: string, group: OptionGroup) => {
    const currentSelections = selections[groupId] || [];
    const isSelected = currentSelections.includes(itemId);
    
    if (group.selection_type === "single") {
      setSelections(prev => ({
        ...prev,
        [groupId]: isSelected ? [] : [itemId]
      }));
      if (!isSelected) {
        setQuantities(prev => ({ ...prev, [itemId]: 1 }));
      }
    } else {
      if (isSelected) {
        setSelections(prev => ({
          ...prev,
          [groupId]: currentSelections.filter(id => id !== itemId)
        }));
      } else {
        if (group.max_selections && currentSelections.length >= group.max_selections) {
          toast.error(`Máximo de ${group.max_selections} seleções`);
          return;
        }
        setSelections(prev => ({
          ...prev,
          [groupId]: [...currentSelections, itemId]
        }));
        setQuantities(prev => ({ ...prev, [itemId]: 1 }));
      }
    }
  }, [selections]);

  const handleQuantityChange = useCallback((itemId: string, delta: number) => {
    if (!allowOptionItemQuantity) return;
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [itemId]: newQty };
    });
  }, [allowOptionItemQuantity]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

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
    return groups.every(isGroupValid);
  }, [groups, isGroupValid]);

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

    let description = selectedOptions.length > 0 ? selectedOptions.join(", ") : undefined;
    if (notes.trim()) {
      description = description ? `${description} | Obs: ${notes.trim()}` : `Obs: ${notes.trim()}`;
    }

    addToCart({
      id: `${product.id}-${Date.now()}`,
      product_id: product.id,
      name: product.name,
      price: totalPrice,
      quantity: 1,
      category: category.name,
      description,
      image_url: product.image_url || undefined,
    });

    toast.success("Adicionado ao carrinho!");
    
    if (onShowUpsell) {
      onShowUpsell(category.id);
    } else {
      onComplete();
    }
  }, [groups, selections, items, quantities, allowOptionItemQuantity, notes, addToCart, product, totalPrice, category, onShowUpsell, onComplete]);

  // Total selections count
  const totalSelections = useMemo(() => {
    return Object.values(selections).reduce((sum, arr) => sum + arr.length, 0);
  }, [selections]);

  // Filter items by search
  const getFilteredItems = useCallback((groupId: string) => {
    const groupItems = items[groupId] || [];
    if (!searchQuery.trim()) return groupItems;
    return groupItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);


  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-white flex flex-col"
      >
        {/* Desktop Header - Only visible on lg+ */}
        <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-lg font-semibold text-foreground">Detalhes do produto</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
              <Search className="w-5 h-5 text-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </header>

        {/* Mobile Hero Image Section - Only visible on mobile */}
        <div className="relative flex-shrink-0 lg:hidden">
          <div className="relative h-64 sm:h-72 bg-gray-900">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-6xl">🍔</span>
              </div>
            )}
            
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <button 
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
              <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-28">
          <div className="px-4 py-4 lg:max-w-2xl lg:mx-auto lg:px-8 lg:py-8">
            
            {/* Desktop Product Hero - Horizontal layout */}
            <div className="hidden lg:flex gap-6 mb-6 items-start">
              {/* Product Image - Square with rounded corners */}
              <div className="w-44 h-44 rounded-2xl overflow-hidden flex-shrink-0">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-5xl">🍔</span>
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="flex-1 min-w-0 pt-2">
                <h1 className="text-xl font-bold text-foreground leading-tight uppercase">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  {hasPromotion && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(originalPrice!)}
                    </span>
                  )}
                  <span className={cn(
                    "text-lg font-bold",
                    hasPromotion ? "text-green-600" : "text-foreground"
                  )}>
                    {formatCurrency(basePrice)}
                  </span>
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile Product Info */}
            <div className="mb-4 lg:hidden">
              <h1 className="text-xl font-bold text-foreground leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {hasPromotion && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(originalPrice!)}
                  </span>
                )}
                <span className={cn(
                  "text-lg font-bold",
                  hasPromotion ? "text-green-600" : "text-foreground"
                )}>
                  {formatCurrency(basePrice)}
                </span>
              </div>
              {product.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-4">
                <div className="h-11 bg-muted rounded-lg animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Search Bar */}
                {groups.length > 0 && (
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquise pelo nome"
                      className="pl-10 pr-10 h-11 bg-muted/50 border-0 rounded-lg text-sm"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}

                {/* Option Groups - Collapsible style */}
                <div className="space-y-2">
              {groups.map((group) => {
                const groupItems = getFilteredItems(group.id);
                const isExpanded = expandedGroups.has(group.id);
                const selectedCount = (selections[group.id] || []).length;
                
                return (
                  <div key={group.id} className="border-b border-border/50 last:border-b-0">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground uppercase tracking-wide">
                          {group.name}
                        </span>
                        {group.is_required && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                            Obrigatório
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {group.selection_type === "single" 
                            ? "Escolha 1 item"
                            : group.max_selections 
                              ? `Escolha até ${group.max_selections} itens`
                              : "Escolha os itens"
                          }
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-amber-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                    </button>
                    
                    {/* Group Items */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-3 space-y-1">
                            {groupItems.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Nenhum item encontrado
                              </p>
                            ) : (
                              groupItems.map((item) => {
                                const isSelected = (selections[group.id] || []).includes(item.id);
                                const qty = quantities[item.id] || 1;
                                const effectivePrice = getItemEffectivePrice(item);
                                
                                return (
                                  <div 
                                    key={item.id}
                                    className={cn(
                                      "flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors",
                                      isSelected && "bg-amber-50"
                                    )}
                                  >
                                    {/* Item Image */}
                                    {item.image_url && (
                                      <img 
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                      />
                                    )}
                                    
                                    {/* Item Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-foreground leading-tight">
                                        {item.name}
                                      </p>
                                      {item.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                          {item.description}
                                        </p>
                                      )}
                                      {effectivePrice > 0 && (
                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                          R$ {effectivePrice.toFixed(2).replace('.', ',')}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* Add/Quantity Button */}
                                    <div className="flex-shrink-0">
                                      {isSelected && allowOptionItemQuantity && group.selection_type === "multiple" ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              if (qty <= 1) {
                                                handleItemSelect(group.id, item.id, group);
                                              } else {
                                                handleQuantityChange(item.id, -1);
                                              }
                                            }}
                                            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                          >
                                            <span className="text-lg font-medium text-gray-600">−</span>
                                          </button>
                                          <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                                          <button
                                            onClick={() => handleQuantityChange(item.id, 1)}
                                            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                          >
                                            <Plus className="w-4 h-4 text-gray-600" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleItemSelect(group.id, item.id, group)}
                                          className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                            isSelected 
                                              ? "bg-amber-500 text-white" 
                                              : "text-amber-500 hover:bg-amber-50"
                                          )}
                                        >
                                          <Plus className={cn(
                                            "w-5 h-5 transition-transform",
                                            isSelected && "rotate-45"
                                          )} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Observations */}
            <div className="mt-6">
              <label className="text-sm font-semibold text-foreground">
                Observações
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Tirar cebola, ovo, etc."
                className="mt-2 min-h-[80px] resize-none border-border bg-muted/30"
              />
            </div>
              </>
            )}
          </div>
        </main>

        {/* Footer - Fixed bottom button */}
        <motion.footer
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 25, stiffness: 400 }}
          className="fixed bottom-0 inset-x-0 bg-white border-t border-border p-4 z-10"
        >
          <div className="lg:max-w-2xl lg:mx-auto lg:px-4">
            <Button
              onClick={handleAddToCart}
              disabled={!canProceed && groups.some(g => g.is_required)}
              className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg disabled:opacity-50"
            >
              Avançar
            </Button>
          </div>
        </motion.footer>
      </motion.div>
    </AnimatePresence>
  );
}
