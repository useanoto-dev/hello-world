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

// EdgeWithPrice and Drink interfaces kept for onComplete signature compatibility
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
  flowSteps?: Record<string, { is_enabled: boolean; next_step_id: string | null }>;
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
  const [notes, setNotes] = useState("");

  const { data: flavors = [], isLoading } = useQuery({
    queryKey: ["pizza-flavors", categoryId, sizeId],
    queryFn: () => fetchFlavorsWithPrices(categoryId, sizeId),
    enabled: open && !!sizeId,
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
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!");
      } catch {
        toast.error("Não foi possível compartilhar");
      }
    }
  }, [sizeName]);

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


  const handleContinue = () => {
    if (selectedFlavors.length === 0) {
      toast.error("Selecione pelo menos 1 sabor");
      return;
    }
    // Go directly to complete - no edge or drink modals
    onComplete(selectedFlavors, totalPrice, null, null, notes.trim() || undefined);
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
              <button 
                onClick={handleShare}
                className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
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
              onClick={handleShare}
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
              <div className="hidden lg:flex gap-6 mb-6 items-start">
                {/* Product Image - Square with rounded corners */}
                <div className="w-40 h-40 rounded-2xl overflow-hidden flex-shrink-0">
                  {sizeImageUrl ? (
                    <img 
                      src={sizeImageUrl} 
                      alt={sizeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200">
                      <span className="text-5xl">🍕</span>
                    </div>
                  )}
                </div>
                
                {/* Product Info - Only name and description, no price */}
                <div className="flex-1 min-w-0 pt-2">
                  <h1 className="text-xl font-bold text-foreground leading-tight uppercase">
                    Pizza {sizeName}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
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

          {/* Footer - Only show when flavor is selected, floating button without background on desktop */}
          <AnimatePresence>
            {selectedFlavors.length > 0 && (
              <motion.footer
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="fixed bottom-0 inset-x-0 p-4 z-10 bg-white border-t border-border lg:bg-transparent lg:border-0"
              >
                <div className="lg:max-w-2xl lg:mx-auto lg:px-4">
                  {/* Mobile: show total and count */}
                  <div className="flex items-center justify-between mb-3 lg:hidden">
                    <div>
                      <span className="text-sm text-muted-foreground">Total</span>
                      <p className="text-xs text-muted-foreground">
                        {selectedFlavors.length} {selectedFlavors.length === 1 ? 'sabor' : 'sabores'}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  <Button
                    onClick={handleContinue}
                    className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg"
                  >
                    Continuar
                  </Button>
                </div>
              </motion.footer>
            )}
          </AnimatePresence>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
