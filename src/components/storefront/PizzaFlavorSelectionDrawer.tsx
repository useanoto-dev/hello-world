import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Star, ChevronDown, Share2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  sizeImageUrl?: string | null;
  flowSteps?: Record<string, FlowStepConfig>;
  onComplete: (flavors: SelectedFlavor[], totalPrice: number, edge?: EdgeWithPrice | null, drink?: Drink | null, notes?: string) => void;
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
  sizeImageUrl,
  flowSteps,
  onComplete,
}: PizzaFlavorSelectionDrawerProps) {
  const [selectedFlavors, setSelectedFlavors] = useState<SelectedFlavor[]>([]);
  const [currentStep, setCurrentStep] = useState<FlowStep>('flavors');
  const [selectedEdge, setSelectedEdge] = useState<EdgeWithPrice | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [notes, setNotes] = useState("");

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
      setNotes("");
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
    else onComplete(selectedFlavors, totalPrice, null, null, notes.trim() || undefined);
  };

  const handleEdgeContinue = () => {
    const nextStep = getNextStep('edge');
    if (nextStep === 'complete') onComplete(selectedFlavors, calculatedPrice, selectedEdge, null, notes.trim() || undefined);
    else setCurrentStep(nextStep);
  };

  const handleDrinkSelect = (drink: Drink) => {
    onComplete(selectedFlavors, calculatedPrice, selectedEdge, drink, notes.trim() || undefined);
  };

  const handleDrinkSkip = () => {
    onComplete(selectedFlavors, calculatedPrice, selectedEdge, null, notes.trim() || undefined);
  };

  // Card for traditional flavors
  const TraditionalCard = ({ flavor }: { flavor: FlavorWithPrice }) => {
    const isSelected = selectedFlavors.some(f => f.id === flavor.id);
    return (
      <button
        onClick={() => handleSelectFlavor(flavor)}
        className={cn(
          "text-left px-3 py-2.5 rounded-xl border transition-all duration-150 w-full",
          isSelected 
            ? "bg-amber-50 border-amber-300 shadow-sm" 
            : "bg-white border-gray-100 hover:border-gray-200"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-foreground leading-tight">{flavor.name}</p>
            {flavor.description && (
              <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                {flavor.description}
              </p>
            )}
          </div>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
        </div>
      </button>
    );
  };

  // Card for special/premium flavors
  const SpecialCard = ({ flavor }: { flavor: FlavorWithPrice }) => {
    const isSelected = selectedFlavors.some(f => f.id === flavor.id);
    return (
      <button
        onClick={() => handleSelectFlavor(flavor)}
        className={cn(
          "text-left px-3 py-2.5 rounded-xl border transition-all duration-150 w-full",
          isSelected 
            ? "bg-amber-100 border-amber-400 shadow-sm" 
            : "bg-amber-50/60 border-amber-100 hover:border-amber-200"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-sm text-foreground leading-tight">{flavor.name}</p>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
            </div>
            {flavor.description && (
              <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                {flavor.description}
              </p>
            )}
            <p className="text-xs font-semibold text-red-500 mt-0.5">
              A partir de {formatCurrency(flavor.price)}
            </p>
          </div>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
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

          {/* Mobile Fixed Header with Back/Share buttons */}
          <div className="fixed top-0 inset-x-0 z-20 flex items-center justify-between p-4 lg:hidden">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button 
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto pb-32 lg:pb-36">
            {/* Mobile Hero Image Section */}
            <div className="relative lg:hidden">
              <div className="relative h-56 sm:h-72 bg-gray-900">
                {sizeImageUrl ? (
                  <img 
                    src={sizeImageUrl} 
                    alt={sizeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200">
                    <span className="text-8xl">🍕</span>
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
                
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                  <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 lg:max-w-2xl lg:mx-auto lg:px-8 lg:py-8">
              
              {/* Desktop Product Hero - Horizontal layout */}
              <div className="hidden lg:flex gap-5 mb-6">
                {/* Product Image */}
                <div className="w-40 h-28 rounded-xl overflow-hidden flex-shrink-0">
                  {sizeImageUrl ? (
                    <img 
                      src={sizeImageUrl} 
                      alt={sizeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200 rounded-xl">
                      <span className="text-4xl">🍕</span>
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 min-w-0 py-1">
                  <h1 className="text-lg font-bold text-foreground leading-tight uppercase">
                    Pizza {sizeName}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-red-500">
                      {formatCurrency(basePrice)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Escolha até {maxFlavors} {maxFlavors === 1 ? 'sabor' : 'sabores'} para sua pizza
                  </p>
                </div>
              </div>

              {/* Mobile Product Info */}
              <div className="mb-5 lg:hidden">
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  Pizza {sizeName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-amber-500">
                    {formatCurrency(basePrice)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Escolha até {maxFlavors} {maxFlavors === 1 ? 'sabor' : 'sabores'} para sua pizza
                </p>
              </div>

              {/* Sr Pizza */}
              <SrPizzaButton flavors={flavors} onFlavorSelect={handleSrPizzaSelect} />


              {isLoading ? (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : flavors.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-5xl mb-2">🍕</p>
                  <p className="text-sm text-muted-foreground">Nenhum sabor disponível</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {salgadasTradicionais.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <span>🍕</span> Pizzas Salgadas Tradicionais
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {salgadasTradicionais.map(f => <TraditionalCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}

                  {salgadasEspeciais.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <span>⭐</span> Pizzas Salgadas Especiais
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {salgadasEspeciais.map(f => <SpecialCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}

                  {docesTradicionais.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <span>🍰</span> Pizzas Doces Tradicionais
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {docesTradicionais.map(f => <TraditionalCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}

                  {docesEspeciais.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <span>⭐</span> Pizzas Doces Especiais
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {docesEspeciais.map(f => <SpecialCard key={f.id} flavor={f} />)}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Observations */}
              <div className="mt-6">
                <label className="text-sm font-semibold text-foreground">
                  Observações
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Sem cebola, bem assada, etc."
                  className="mt-2 min-h-[80px] resize-none border-border bg-muted/30"
                />
              </div>
            </div>
          </main>

          {/* Footer - Fixed bottom */}
          <motion.footer
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 25, stiffness: 400 }}
            className="fixed bottom-0 inset-x-0 bg-white border-t border-border p-4 z-10"
          >
            <div className="lg:max-w-2xl lg:mx-auto lg:px-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm text-muted-foreground">Total</span>
                  {selectedFlavors.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFlavors.length} {selectedFlavors.length === 1 ? 'sabor' : 'sabores'}
                    </p>
                  )}
                </div>
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <Button
                onClick={handleContinue}
                disabled={selectedFlavors.length === 0}
                className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedFlavors.length === 0 
                  ? `Selecione pelo menos 1 sabor`
                  : `Continuar`
                }
              </Button>
            </div>
          </motion.footer>
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
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm z-[60] bg-background rounded-2xl flex flex-col max-h-[70vh] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border">
                <h3 className="text-base font-semibold text-center text-foreground">Escolha a Borda</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <button
                  onClick={() => setSelectedEdge(null)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                    selectedEdge === null ? "bg-amber-50 border-amber-300" : "bg-background border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span className="font-medium text-foreground">Sem Borda</span>
                  <span className="text-sm text-muted-foreground">Grátis</span>
                </button>
                {edges.map((edge) => (
                  <button
                    key={edge.id}
                    onClick={() => setSelectedEdge(edge)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                      selectedEdge?.id === edge.id ? "bg-amber-50 border-amber-300" : "bg-background border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="font-medium text-foreground">{edge.name}</span>
                    <span className="text-sm font-medium text-amber-600">
                      {edge.price > 0 ? `+${formatCurrency(edge.price)}` : 'Grátis'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-border">
                <Button onClick={handleEdgeContinue} className="w-full h-11 text-sm font-semibold bg-amber-500 hover:bg-amber-600 rounded-xl">
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
              className="relative w-full max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 text-center">
                <p className="text-3xl mb-1">🥤</p>
                <h3 className="text-base font-semibold text-foreground">Que tal uma bebida?</h3>
                <p className="text-sm text-muted-foreground">Complete seu pedido!</p>
              </div>
              <div className="px-4 pb-3 max-h-[250px] overflow-y-auto">
                {drinks.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">Nenhuma bebida disponível</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {drinks.map((drink) => {
                      const price = drink.promotional_price ?? drink.price;
                      return (
                        <button
                          key={drink.id}
                          onClick={() => handleDrinkSelect(drink)}
                          className="flex flex-col rounded-xl overflow-hidden border border-border hover:border-amber-300 transition-all bg-background"
                        >
                          <div className="h-16 bg-muted relative flex items-center justify-center">
                            {drink.image_url ? (
                              <img src={drink.image_url} alt={drink.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">🥤</span>
                            )}
                            {drink.promotional_price && drink.promotional_price < drink.price && (
                              <span className="absolute top-0 left-0 px-1 bg-red-500 text-white text-[8px] font-bold rounded-br">%</span>
                            )}
                          </div>
                          <div className="p-2 text-center">
                            <p className="text-xs font-medium text-foreground line-clamp-1">{drink.name}</p>
                            <p className="text-xs font-bold text-amber-600">{formatCurrency(price)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border space-y-2">
                <Button onClick={handleDrinkSkip} variant="outline" className="w-full h-10 text-sm font-medium rounded-xl">
                  Sem bebida
                </Button>
                <button
                  onClick={() => isStepEnabled('edge') && edges.length > 0 ? setCurrentStep('edge') : setCurrentStep('flavors')}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
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
