// Combo Upsell Modal - Full screen modal combining Edges + Doughs + Additionals
// Similar style to PizzaFlavorSelectionDrawer
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Plus, Minus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EdgeWithPrice {
  id: string;
  name: string;
  price: number;
}

interface DoughWithPrice {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

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

interface ComboSelections {
  edge: EdgeWithPrice | null;
  dough: DoughWithPrice | null;
  additionals: SelectedAdditional[];
}

interface ComboUpsellModalProps {
  open: boolean;
  storeId: string;
  categoryId: string;
  sizeId: string;
  sizeName: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonColor?: string;
  onClose: () => void;
  onComplete: (selections: ComboSelections, totalPrice: number) => void;
}

// Fetch functions
async function fetchEdgesWithPrices(categoryId: string, sizeId: string) {
  const { data, error } = await supabase
    .from("pizza_edges")
    .select(`
      id,
      name,
      pizza_edge_prices!inner(
        price,
        is_available
      )
    `)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .eq("pizza_edge_prices.size_id", sizeId)
    .eq("pizza_edge_prices.is_available", true)
    .order("display_order");

  if (error) throw error;

  return (data || []).map((edge: any) => ({
    id: edge.id,
    name: edge.name,
    price: edge.pizza_edge_prices[0]?.price || 0,
  }));
}

async function fetchDoughsWithPrices(categoryId: string, sizeId: string) {
  const { data, error } = await supabase
    .from("pizza_doughs")
    .select(`
      id,
      name,
      description,
      pizza_dough_prices!inner(
        price,
        is_available
      )
    `)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .eq("pizza_dough_prices.size_id", sizeId)
    .eq("pizza_dough_prices.is_available", true)
    .order("display_order");

  if (error) throw error;

  return (data || []).map((dough: any) => ({
    id: dough.id,
    name: dough.name,
    description: dough.description,
    price: dough.pizza_dough_prices[0]?.price || 0,
  }));
}

async function fetchAdditionals(storeId: string, categoryId: string) {
  const { data: groups, error: groupsError } = await supabase
    .from("category_option_groups")
    .select("id, name")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .eq("is_primary", false)
    .order("display_order");

  if (groupsError) throw groupsError;
  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map(g => g.id);
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

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

export default function ComboUpsellModal({
  open,
  storeId,
  categoryId,
  sizeId,
  sizeName,
  title = "Deseja adicionar algo? ✨",
  description = "Turbine sua pizza com ingredientes extras!",
  buttonText = "Confirmar",
  buttonColor = "#3b82f6",
  onClose,
  onComplete,
}: ComboUpsellModalProps) {
  const [loading, setLoading] = useState(true);
  
  // Data
  const [edges, setEdges] = useState<EdgeWithPrice[]>([]);
  const [doughs, setDoughs] = useState<DoughWithPrice[]>([]);
  const [additionals, setAdditionals] = useState<AdditionalItem[]>([]);
  
  // Selections
  const [selectedEdge, setSelectedEdge] = useState<EdgeWithPrice | null>(null);
  const [selectedDough, setSelectedDough] = useState<DoughWithPrice | null>(null);
  const [selectedAdditionals, setSelectedAdditionals] = useState<Map<string, SelectedAdditional>>(new Map());

  useEffect(() => {
    if (open) {
      loadAllData();
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open, categoryId, sizeId]);

  useEffect(() => {
    if (open) {
      setSelectedEdge(null);
      setSelectedDough(null);
      setSelectedAdditionals(new Map());
    }
  }, [open]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [edgesData, doughsData, additionalsData] = await Promise.all([
        fetchEdgesWithPrices(categoryId, sizeId),
        fetchDoughsWithPrices(categoryId, sizeId),
        fetchAdditionals(storeId, categoryId),
      ]);
      
      setEdges(edgesData);
      setDoughs(doughsData);
      setAdditionals(additionalsData);
      
      // Auto-close if nothing to show
      if (edgesData.length === 0 && doughsData.length === 0 && additionalsData.length === 0) {
        onComplete({ edge: null, dough: null, additionals: [] }, 0);
      }
    } catch (error) {
      console.error("Error loading combo data:", error);
      onComplete({ edge: null, dough: null, additionals: [] }, 0);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdditional = (item: AdditionalItem) => {
    setSelectedAdditionals(prev => {
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

  const updateAdditionalQuantity = (itemId: string, delta: number) => {
    setSelectedAdditionals(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;
      
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        newMap.delete(itemId);
      } else if (newQty <= 10) {
        newMap.set(itemId, { ...current, quantity: newQty });
      }
      return newMap;
    });
  };

  const totalPrice = useMemo(() => {
    let total = 0;
    if (selectedEdge) total += selectedEdge.price;
    if (selectedDough) total += selectedDough.price;
    selectedAdditionals.forEach(item => {
      total += item.price * item.quantity;
    });
    return total;
  }, [selectedEdge, selectedDough, selectedAdditionals]);

  const handleConfirm = () => {
    onComplete(
      {
        edge: selectedEdge,
        dough: selectedDough,
        additionals: Array.from(selectedAdditionals.values()),
      },
      totalPrice
    );
  };

  const handleSkip = () => {
    onComplete({ edge: null, dough: null, additionals: [] }, 0);
  };

  // Group additionals by group_name
  const groupedAdditionals = useMemo(() => {
    return additionals.reduce((acc, item) => {
      if (!acc[item.group_name]) {
        acc[item.group_name] = [];
      }
      acc[item.group_name].push(item);
      return acc;
    }, {} as Record<string, AdditionalItem[]>);
  }, [additionals]);

  const hasAnyData = edges.length > 0 || doughs.length > 0 || additionals.length > 0;

  if (!open) return null;

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Header - Compact */}
          <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-background sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-foreground">{title}</h1>
                {sizeName && (
                  <p className="text-[11px] text-muted-foreground">Tamanho {sizeName}</p>
                )}
              </div>
            </div>
            {totalPrice > 0 && (
              <div 
                className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: buttonColor }}
              >
                +{formatCurrency(totalPrice)}
              </div>
            )}
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto pb-32">
            {loading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !hasAnyData ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-muted-foreground">Nenhum item disponível</p>
              </div>
            ) : (
              <div className="p-3 space-y-4">
                {/* Description */}
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}

                {/* Doughs Section - Compact */}
                {doughs.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <span className="text-sm">🥖</span> MASSA
                    </h3>
                    <div className="space-y-1">
                      {/* Traditional (default) */}
                      <button
                        onClick={() => setSelectedDough(null)}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all",
                          selectedDough === null
                            ? "bg-purple-50"
                            : "bg-card hover:bg-muted/50"
                        )}
                      >
                        {/* Radio Button */}
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          selectedDough === null
                            ? "border-purple-500 bg-purple-500"
                            : "border-muted-foreground/40"
                        )}>
                          {selectedDough === null && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="font-medium text-xs text-foreground flex-1 text-left">Tradicional</span>
                        <span className="text-[10px] text-muted-foreground">Incluso</span>
                      </button>
                      
                      {doughs.map((dough) => (
                        <button
                          key={dough.id}
                          onClick={() => setSelectedDough(dough)}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all",
                            selectedDough?.id === dough.id
                              ? "bg-purple-50"
                              : "bg-card hover:bg-muted/50"
                          )}
                        >
                          {/* Radio Button */}
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            selectedDough?.id === dough.id
                              ? "border-purple-500 bg-purple-500"
                              : "border-muted-foreground/40"
                          )}>
                            {selectedDough?.id === dough.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <span className="font-medium text-xs text-foreground block truncate">{dough.name}</span>
                            {dough.description && (
                              <p className="text-[10px] text-muted-foreground truncate">{dough.description}</p>
                            )}
                          </div>
                          {dough.price > 0 ? (
                            <span className="text-[10px] font-semibold text-purple-600 flex-shrink-0">
                              +{formatCurrency(dough.price)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">Incluso</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Edges Section - Compact */}
                {edges.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <span className="text-sm">🧀</span> BORDA
                    </h3>
                    <div className="space-y-1">
                      {/* No edge (default) */}
                      <button
                        onClick={() => setSelectedEdge(null)}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all",
                          selectedEdge === null
                            ? "bg-orange-50"
                            : "bg-card hover:bg-muted/50"
                        )}
                      >
                        {/* Radio Button */}
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          selectedEdge === null
                            ? "border-orange-500 bg-orange-500"
                            : "border-muted-foreground/40"
                        )}>
                          {selectedEdge === null && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="font-medium text-xs text-foreground flex-1 text-left">Sem Borda</span>
                        <span className="text-[10px] text-muted-foreground">Grátis</span>
                      </button>
                      
                      {edges.map((edge) => (
                        <button
                          key={edge.id}
                          onClick={() => setSelectedEdge(edge)}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all",
                            selectedEdge?.id === edge.id
                              ? "bg-orange-50"
                              : "bg-card hover:bg-muted/50"
                          )}
                        >
                          {/* Radio Button */}
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            selectedEdge?.id === edge.id
                              ? "border-orange-500 bg-orange-500"
                              : "border-muted-foreground/40"
                          )}>
                            {selectedEdge?.id === edge.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="font-medium text-xs text-foreground flex-1 text-left">{edge.name}</span>
                          <span className="text-[10px] font-semibold text-orange-600 flex-shrink-0">
                            +{formatCurrency(edge.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Additionals Section - Compact */}
                {Object.keys(groupedAdditionals).length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <span className="text-sm">➕</span> ADICIONAIS
                    </h3>
                    {Object.entries(groupedAdditionals).map(([groupName, items]) => (
                      <div key={groupName} className="mb-3">
                        {Object.keys(groupedAdditionals).length > 1 && (
                          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">{groupName}</p>
                        )}
                        <div className="space-y-1">
                          {items.map((item) => {
                            const selectedItem = selectedAdditionals.get(item.id);
                            const isSelected = !!selectedItem;
                            
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg transition-all",
                                  isSelected
                                    ? "bg-blue-50"
                                    : "bg-card hover:bg-muted/50"
                                )}
                              >
                                <button
                                  onClick={() => !isSelected && toggleAdditional(item)}
                                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                                >
                                  {/* Checkbox style */}
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                                    isSelected
                                      ? "border-blue-500 bg-blue-500"
                                      : "border-muted-foreground/40"
                                  )}>
                                    {isSelected && (
                                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    )}
                                  </div>
                                  <span className="font-medium text-xs text-foreground truncate">{item.name}</span>
                                  {item.price > 0 && (
                                    <span className="text-[10px] font-semibold text-blue-600 flex-shrink-0">
                                      +{formatCurrency(item.price)}
                                    </span>
                                  )}
                                </button>
                                
                                {isSelected && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={() => updateAdditionalQuantity(item.id, -1)}
                                      className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-5 text-center font-semibold text-xs">
                                      {selectedItem.quantity}
                                    </span>
                                    <button
                                      onClick={() => updateAdditionalQuantity(item.id, 1)}
                                      className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            )}
          </main>

          {/* Fixed Footer - Compact */}
          <div className="fixed inset-x-0 bottom-0 p-3 bg-background border-t border-border space-y-1.5 z-30">
            <Button
              onClick={handleConfirm}
              className="w-full h-10 text-sm font-semibold text-white"
              style={{ backgroundColor: buttonColor }}
            >
              {totalPrice > 0 ? (
                <>
                  {buttonText} (+{formatCurrency(totalPrice)})
                </>
              ) : (
                buttonText
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full h-8 text-xs"
            >
              Não, obrigado
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
