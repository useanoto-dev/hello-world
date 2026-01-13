import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SrPizzaButton } from "./SrPizzaButton";

interface FlavorWithPrice {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  flavor_type: string;
  is_premium: boolean;
  price: number;
  surcharge: number;
}

interface SelectedFlavor {
  id: string;
  name: string;
  price: number;
  surcharge: number;
  flavor_type: string;
}

interface EdgeWithPrice {
  id: string;
  name: string;
  price: number;
}

interface Drink {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
}

interface FlowStepConfig {
  is_enabled: boolean;
  next_step_id: string | null;
}

interface PizzaFlavorSelectionDrawerProps {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  sizeId: string;
  sizeName: string;
  maxFlavors: number;
  storeId: string;
  basePrice: number;
  flowSteps?: Record<string, FlowStepConfig>;
  onComplete: (flavors: SelectedFlavor[], totalPrice: number, edge?: EdgeWithPrice | null, drink?: Drink | null) => void;
}

async function fetchFlavorsWithPrices(categoryId: string, sizeId: string) {
  const { data, error } = await supabase
    .from("pizza_flavors")
    .select(`
      id,
      name,
      description,
      image_url,
      flavor_type,
      is_premium,
      pizza_flavor_prices(
        price,
        surcharge,
        is_available,
        size_id
      )
    `)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;

  return (data || []).map((flavor: any) => {
    const priceData = flavor.pizza_flavor_prices?.find(
      (p: any) => p.size_id === sizeId && p.is_available !== false
    );
    
    return {
      id: flavor.id,
      name: flavor.name,
      description: flavor.description,
      image_url: flavor.image_url,
      flavor_type: flavor.flavor_type,
      is_premium: flavor.is_premium,
      price: priceData?.price || 0,
      surcharge: priceData?.surcharge || 0,
    };
  });
}

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

async function fetchDrinks(storeId: string): Promise<Drink[]> {
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .or("slug.ilike.%bebida%,name.ilike.%bebida%,slug.ilike.%drink%,name.ilike.%drink%,slug.ilike.%refrigerante%,name.ilike.%refrigerante%");

  if (!categories || categories.length === 0) return [];

  const categoryIds = categories.map(c => c.id);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, promotional_price, image_url")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .in("category_id", categoryIds)
    .order("display_order")
    .limit(6);

  return (products || []) as Drink[];
}

type FlowStep = 'flavors' | 'edge' | 'drink';

export function PizzaFlavorSelectionDrawer({
  open,
  onClose,
  categoryId,
  sizeId,
  sizeName,
  maxFlavors,
  storeId,
  basePrice,
  flowSteps,
  onComplete,
}: PizzaFlavorSelectionDrawerProps) {
  const [selectedFlavors, setSelectedFlavors] = useState<SelectedFlavor[]>([]);
  const [currentStep, setCurrentStep] = useState<FlowStep>('flavors');
  const [selectedEdge, setSelectedEdge] = useState<EdgeWithPrice | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  const { data: flavors = [], isLoading } = useQuery({
    queryKey: ["pizza-flavors", categoryId, sizeId],
    queryFn: () => fetchFlavorsWithPrices(categoryId, sizeId),
    enabled: open && !!sizeId,
  });

  const { data: edges = [] } = useQuery({
    queryKey: ["pizza-edges-modal", categoryId, sizeId],
    queryFn: () => fetchEdgesWithPrices(categoryId, sizeId),
    enabled: open && !!sizeId,
  });

  const { data: drinks = [] } = useQuery({
    queryKey: ["drinks-modal", storeId],
    queryFn: () => fetchDrinks(storeId),
    enabled: open && !!storeId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    if (open) window.scrollTo(0, 0);
  }, [open, sizeId]);

  useEffect(() => {
    if (open) {
      setSelectedFlavors([]);
      setCurrentStep('flavors');
      setSelectedEdge(null);
      setCalculatedPrice(0);
    }
  }, [open]);

  const salgadasTradicionais = useMemo(() => flavors.filter(f => f.flavor_type === 'salgada' && !f.is_premium), [flavors]);
  const salgadasEspeciais = useMemo(() => flavors.filter(f => f.flavor_type === 'salgada' && f.is_premium), [flavors]);
  const docesTradicionais = useMemo(() => flavors.filter(f => f.flavor_type === 'doce' && !f.is_premium), [flavors]);
  const docesEspeciais = useMemo(() => flavors.filter(f => f.flavor_type === 'doce' && f.is_premium), [flavors]);

  const totalPrice = useMemo(() => {
    if (selectedFlavors.length === 0) return basePrice;
    return basePrice + selectedFlavors.reduce((sum, f) => sum + f.surcharge, 0);
  }, [selectedFlavors, basePrice]);

  const handleSelectFlavor = useCallback((flavor: FlavorWithPrice) => {
    setSelectedFlavors((prev) => {
      const isSelected = prev.some(f => f.id === flavor.id);
      if (isSelected) return prev.filter(f => f.id !== flavor.id);
      if (prev.length >= maxFlavors) {
        toast.error(`Máximo de ${maxFlavors} sabores`);
        return prev;
      }
      return [...prev, {
        id: flavor.id,
        name: flavor.name,
        price: flavor.price,
        surcharge: flavor.is_premium ? flavor.surcharge : 0,
        flavor_type: flavor.flavor_type,
      }];
    });
  }, [maxFlavors]);

  const handleSrPizzaSelect = useCallback((flavor: FlavorWithPrice) => {
    const flavorData = flavors.find(f => f.id === flavor.id);
    if (flavorData && selectedFlavors.length < maxFlavors && !selectedFlavors.some(f => f.id === flavor.id)) {
      handleSelectFlavor(flavorData);
    }
  }, [flavors, selectedFlavors, maxFlavors, handleSelectFlavor]);

  const isStepEnabled = useCallback((stepType: string) => {
    if (!flowSteps) return true;
    return flowSteps[stepType]?.is_enabled !== false;
  }, [flowSteps]);

  const getNextStep = useCallback((currentStepType: string): FlowStep | 'complete' => {
    const stepOrder: FlowStep[] = ['edge', 'drink'];
    const currentIndex = stepOrder.indexOf(currentStepType as FlowStep);
    for (let i = currentIndex + 1; i < stepOrder.length; i++) {
      if (isStepEnabled(stepOrder[i])) {
        if (stepOrder[i] === 'edge' && edges.length === 0) continue;
        if (stepOrder[i] === 'drink' && drinks.length === 0) continue;
        return stepOrder[i];
      }
    }
    return 'complete';
  }, [isStepEnabled, edges.length, drinks.length]);

  const handleContinue = () => {
    if (selectedFlavors.length === 0) {
      toast.error("Selecione pelo menos 1 sabor");
      return;
    }
    setCalculatedPrice(totalPrice);
    if (isStepEnabled('edge') && edges.length > 0) setCurrentStep('edge');
    else if (isStepEnabled('drink') && drinks.length > 0) setCurrentStep('drink');
    else onComplete(selectedFlavors, totalPrice, null, null);
  };

  const handleEdgeContinue = () => {
    const nextStep = getNextStep('edge');
    if (nextStep === 'complete') onComplete(selectedFlavors, calculatedPrice, selectedEdge, null);
    else setCurrentStep(nextStep);
  };

  const handleDrinkSelect = (drink: Drink) => {
    onComplete(selectedFlavors, calculatedPrice, selectedEdge, drink);
  };

  const handleDrinkSkip = () => {
    onComplete(selectedFlavors, calculatedPrice, selectedEdge, null);
  };

  // Card for traditional flavors - COMPACT
  const TraditionalCard = ({ flavor }: { flavor: FlavorWithPrice }) => {
    const isSelected = selectedFlavors.some(f => f.id === flavor.id);
    return (
      <button
        onClick={() => handleSelectFlavor(flavor)}
        className={cn(
          "text-left px-3 py-2 rounded-lg border transition-all duration-150 w-full",
          isSelected 
            ? "bg-amber-50 border-amber-300" 
            : "bg-white border-gray-100 hover:border-gray-200"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[12px] text-gray-900 leading-tight">{flavor.name}</p>
            {flavor.description && (
              <p className="text-[10px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
                {flavor.description}
              </p>
            )}
          </div>
          {isSelected && (
            <Check className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          )}
        </div>
      </button>
    );
  };

  // Card for special/premium flavors - COMPACT
  const SpecialCard = ({ flavor }: { flavor: FlavorWithPrice }) => {
    const isSelected = selectedFlavors.some(f => f.id === flavor.id);
    return (
      <button
        onClick={() => handleSelectFlavor(flavor)}
        className={cn(
          "text-left px-3 py-2 rounded-lg border transition-all duration-150 w-full",
          isSelected 
            ? "bg-amber-100 border-amber-400" 
            : "bg-amber-50/60 border-amber-100 hover:border-amber-200"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-[12px] text-gray-900 leading-tight">{flavor.name}</p>
              <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
            </div>
            {flavor.description && (
              <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2">
                {flavor.description}
              </p>
            )}
            <p className="text-[10px] font-semibold text-red-500 mt-0.5">
              A partir de {formatCurrency(flavor.price)}
            </p>
          </div>
          {isSelected && (
            <Check className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          )}
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
          <header className="flex-shrink-0 bg-white border-b border-gray-100">
            <div className="max-w-5xl mx-auto px-4 h-11 flex items-center gap-2">
              <button onClick={onClose} className="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="font-semibold text-[13px] text-gray-900">{sizeName}</span>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto pb-16">
            <div className="max-w-5xl mx-auto px-4 py-3 space-y-4">
              {/* Sr Pizza */}
              <SrPizzaButton flavors={flavors} onFlavorSelect={handleSrPizzaSelect} />

              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl py-2 px-4 text-center">
                <p className="text-[11px] font-medium text-gray-600">
                  Escolha até {maxFlavors} sabores.
                </p>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : flavors.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-1">🍕</p>
                  <p className="text-[11px] text-gray-400">Nenhum sabor disponível</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {salgadasTradicionais.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                        <span>🍕</span> Pizzas Salgadas Tradicionais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                        {salgadasTradicionais.map(f => <TraditionalCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}

                  {salgadasEspeciais.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                        <span>⭐</span> Pizzas Salgadas Especiais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                        {salgadasEspeciais.map(f => <SpecialCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}

                  {docesTradicionais.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                        <span>🍰</span> Pizzas Doces Tradicionais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                        {docesTradicionais.map(f => <TraditionalCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}

                  {docesEspeciais.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                        <span>⭐</span> Pizzas Doces Especiais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                        {docesEspeciais.map(f => <SpecialCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Footer */}
          <AnimatePresence>
            {selectedFlavors.length > 0 && (
              <motion.footer
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-3 z-10"
              >
                <div className="max-w-5xl mx-auto">
                  <Button
                    onClick={handleContinue}
                    className="w-full h-10 text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-sm"
                  >
                    Adicionar ao Carrinho ({selectedFlavors.length}/{maxFlavors} sabores)
                  </Button>
                </div>
              </motion.footer>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edge Modal */}
      <AnimatePresence>
        {currentStep === 'edge' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[60]"
              onClick={() => setCurrentStep('flavors')}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xs z-[60] bg-white rounded-2xl flex flex-col max-h-[70vh] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-[13px] font-semibold text-center text-gray-900">Escolha a Borda</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
                <button
                  onClick={() => setSelectedEdge(null)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] transition-all",
                    selectedEdge === null ? "bg-red-50 border-red-200" : "bg-white border-gray-100 hover:border-gray-200"
                  )}
                >
                  <span className="font-medium text-gray-700">Sem Borda</span>
                  <span className="text-[10px] text-gray-400">Grátis</span>
                </button>
                {edges.map((edge) => (
                  <button
                    key={edge.id}
                    onClick={() => setSelectedEdge(edge)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] transition-all",
                      selectedEdge?.id === edge.id ? "bg-red-50 border-red-200" : "bg-white border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <span className="font-medium text-gray-700">{edge.name}</span>
                    <span className="text-[10px] font-medium text-red-500">
                      {edge.price > 0 ? `+${formatCurrency(edge.price)}` : 'Grátis'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-2.5 border-t border-gray-100">
                <Button onClick={handleEdgeContinue} className="w-full h-9 text-[12px] font-semibold bg-red-500 hover:bg-red-600 rounded-xl">
                  Continuar
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drink Modal */}
      <AnimatePresence>
        {currentStep === 'drink' && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={handleDrinkSkip}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="relative w-full max-w-[280px] bg-white rounded-xl shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 text-center">
                <p className="text-xl mb-1">🥤</p>
                <h3 className="text-[12px] font-semibold text-gray-900">Que tal uma bebida?</h3>
                <p className="text-[9px] text-gray-400">Complete seu pedido!</p>
              </div>
              <div className="px-3 pb-2 max-h-[200px] overflow-y-auto">
                {drinks.length === 0 ? (
                  <p className="text-center text-[10px] text-gray-400 py-4">Nenhuma bebida disponível</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {drinks.map((drink) => {
                      const price = drink.promotional_price ?? drink.price;
                      return (
                        <button
                          key={drink.id}
                          onClick={() => handleDrinkSelect(drink)}
                          className="flex flex-col rounded-lg overflow-hidden border border-gray-100 hover:border-red-200 transition-all bg-white"
                        >
                          <div className="h-10 bg-gray-50 relative flex items-center justify-center">
                            {drink.image_url ? (
                              <img src={drink.image_url} alt={drink.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm">🥤</span>
                            )}
                            {drink.promotional_price && drink.promotional_price < drink.price && (
                              <span className="absolute top-0 left-0 px-0.5 bg-red-500 text-white text-[6px] font-bold rounded-br">%</span>
                            )}
                          </div>
                          <div className="p-1 text-center">
                            <p className="text-[8px] font-medium text-gray-700 line-clamp-1">{drink.name}</p>
                            <p className="text-[8px] font-bold text-red-500">{formatCurrency(price)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-2.5 border-t border-gray-50 space-y-1.5">
                <Button onClick={handleDrinkSkip} variant="outline" className="w-full h-7 text-[10px] font-medium border-gray-200 rounded-lg">
                  Sem bebida
                </Button>
                <button
                  onClick={() => isStepEnabled('edge') && edges.length > 0 ? setCurrentStep('edge') : setCurrentStep('flavors')}
                  className="w-full text-center text-[9px] text-gray-400 hover:text-gray-600"
                >
                  ← Voltar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
