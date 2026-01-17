// Combo Upsell Modal - Full screen modal combining Edges + Doughs + Additionals
// Same style as PizzaFlavorSelectionDrawer
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Plus, Minus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  sizeImageUrl?: string | null;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonColor?: string;
  showEdges?: boolean;
  showDoughs?: boolean;
  showAdditionals?: boolean;
  onClose: () => void;
  onComplete: (selections: ComboSelections, totalPrice: number) => void;
}

// Fetch functions
async function fetchEdgesWithPrices(categoryId: string, sizeId: string) {
  // If no sizeId, we can't fetch prices - return empty
  if (!sizeId) return [];
  
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
  // If no sizeId, we can't fetch prices - return empty
  if (!sizeId) return [];
  
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
  sizeImageUrl,
  title = "Personalize sua pizza ✨",
  description = "Escolha massa, borda e adicionais",
  buttonText = "Confirmar",
  buttonColor = "#f59e0b",
  showEdges = true,
  showDoughs = true,
  showAdditionals = true,
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
        showEdges ? fetchEdgesWithPrices(categoryId, sizeId) : Promise.resolve([]),
        showDoughs ? fetchDoughsWithPrices(categoryId, sizeId) : Promise.resolve([]),
        showAdditionals ? fetchAdditionals(storeId, categoryId) : Promise.resolve([]),
      ]);
      
      setEdges(edgesData);
      setDoughs(doughsData);
      setAdditionals(additionalsData);
      
      // Don't auto-close - always show the modal even if empty
      // The user can still skip/confirm manually
    } catch (error) {
      console.error("Error loading combo data:", error);
      onComplete({ edge: null, dough: null, additionals: [] }, 0);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdditional = useCallback((item: AdditionalItem) => {
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
  }, []);

  const updateAdditionalQuantity = useCallback((itemId: string, delta: number) => {
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
  }, []);

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

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `Pizza ${sizeName}`,
      text: `Confira a pizza ${sizeName}!`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!");
      } catch {
        toast.error("Não foi possível compartilhar");
      }
    }
  }, [sizeName]);

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

  // Selection count
  const selectionCount = useMemo(() => {
    let count = 0;
    if (selectedEdge) count++;
    if (selectedDough) count++;
    count += selectedAdditionals.size;
    return count;
  }, [selectedEdge, selectedDough, selectedAdditionals]);

  // Card component for doughs
  const DoughCard = ({ dough, isDefault = false }: { dough?: DoughWithPrice; isDefault?: boolean }) => {
    const isSelected = isDefault ? selectedDough === null : selectedDough?.id === dough?.id;
    return (
      <button
        onClick={() => setSelectedDough(isDefault ? null : dough!)}
        className={cn(
          "text-left px-3 py-2.5 rounded-xl border transition-all duration-150 w-full",
          isSelected 
            ? "bg-purple-50 border-purple-300 shadow-sm" 
            : "bg-white border-gray-100 hover:border-gray-200"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-foreground leading-tight">
              {isDefault ? "Tradicional" : dough?.name}
            </p>
            {!isDefault && dough?.description && (
              <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                {dough.description}
              </p>
            )}
            {isDefault && (
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">Massa padrão</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            {!isDefault && dough && dough.price > 0 ? (
              <span className="text-xs font-semibold text-purple-600">+{formatCurrency(dough.price)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Incluso</span>
            )}
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  // Card component for edges
  const EdgeCard = ({ edge, isDefault = false }: { edge?: EdgeWithPrice; isDefault?: boolean }) => {
    const isSelected = isDefault ? selectedEdge === null : selectedEdge?.id === edge?.id;
    return (
      <button
        onClick={() => setSelectedEdge(isDefault ? null : edge!)}
        className={cn(
          "text-left px-3 py-2.5 rounded-xl border transition-all duration-150 w-full",
          isSelected 
            ? "bg-orange-50 border-orange-300 shadow-sm" 
            : "bg-white border-gray-100 hover:border-gray-200"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-foreground leading-tight">
              {isDefault ? "Sem Borda" : edge?.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            {!isDefault && edge ? (
              <span className="text-xs font-semibold text-orange-600">+{formatCurrency(edge.price)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Grátis</span>
            )}
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  // Card component for additionals
  const AdditionalCard = ({ item }: { item: AdditionalItem }) => {
    const selectedItem = selectedAdditionals.get(item.id);
    const isSelected = !!selectedItem;
    
    return (
      <div
        className={cn(
          "px-3 py-2.5 rounded-xl border transition-all duration-150 w-full",
          isSelected 
            ? "bg-blue-50 border-blue-300 shadow-sm" 
            : "bg-white border-gray-100 hover:border-gray-200"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => !isSelected && toggleAdditional(item)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="font-medium text-sm text-foreground leading-tight">{item.name}</p>
            {item.price > 0 && (
              <p className="text-xs font-semibold text-blue-600 mt-0.5">+{formatCurrency(item.price)}</p>
            )}
          </button>
          
          {isSelected ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => updateAdditionalQuantity(item.id, -1)}
                className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-semibold text-sm">{selectedItem.quantity}</span>
              <button
                onClick={() => updateAdditionalQuantity(item.id, 1)}
                className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => toggleAdditional(item)}
              className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[60] bg-white flex flex-col"
        >
          {/* Simple Header - Both Desktop and Mobile */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-white sticky top-0 z-20">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-base font-semibold text-foreground">{title}</span>
            <button 
              onClick={handleShare}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
          </header>

          {/* Scrollable Content - Minimalist design without banner */}
          <main className="flex-1 overflow-y-auto pb-32 lg:pb-36">
            {/* Content */}
            <div className="px-4 py-4 lg:max-w-2xl lg:mx-auto lg:px-8">
              
              {/* Description and size info */}
              {(description || sizeName) && (
                <div className="mb-4 text-center">
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                  {sizeName && (
                    <p className="text-xs text-muted-foreground mt-1">Tamanho {sizeName}</p>
                  )}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : !hasAnyData ? (
                <div className="text-center py-12">
                  <p className="text-5xl mb-2">🍕</p>
                  <p className="text-sm text-muted-foreground">Nenhum item disponível</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Doughs Section */}
                  {showDoughs && doughs.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <span>🥖</span> Escolha a Massa
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        <DoughCard isDefault />
                        {doughs.map(d => <DoughCard key={d.id} dough={d} />)}
                      </div>
                    </section>
                  )}

                  {/* Edges Section */}
                  {showEdges && edges.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <span>🧀</span> Escolha a Borda
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        <EdgeCard isDefault />
                        {edges.map(e => <EdgeCard key={e.id} edge={e} />)}
                      </div>
                    </section>
                  )}

                  {/* Additionals Section */}
                  {showAdditionals && Object.keys(groupedAdditionals).length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <span>➕</span> Adicionais
                      </h3>
                      {Object.entries(groupedAdditionals).map(([groupName, items]) => (
                        <div key={groupName} className="mb-3">
                          {Object.keys(groupedAdditionals).length > 1 && (
                            <p className="text-xs font-medium text-muted-foreground mb-2">{groupName}</p>
                          )}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {items.map(item => <AdditionalCard key={item.id} item={item} />)}
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Footer - Same style as PizzaFlavorSelectionDrawer */}
          <motion.footer
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 25, stiffness: 400 }}
            className="fixed bottom-0 inset-x-0 bg-white border-t border-border p-4 z-10"
          >
            <div className="lg:max-w-2xl lg:mx-auto lg:px-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm text-muted-foreground">Extras</span>
                  {selectionCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectionCount} {selectionCount === 1 ? 'item' : 'itens'}
                    </p>
                  )}
                </div>
                <span className="text-xl font-bold text-foreground">
                  {totalPrice > 0 ? `+${formatCurrency(totalPrice)}` : "Sem custo extra"}
                </span>
              </div>
              <Button
                onClick={handleConfirm}
                className="w-full h-12 text-base font-semibold text-white rounded-xl shadow-lg"
                style={{ backgroundColor: buttonColor }}
              >
                {buttonText}
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full h-10 text-sm mt-2"
              >
                Não, obrigado
              </Button>
            </div>
          </motion.footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
