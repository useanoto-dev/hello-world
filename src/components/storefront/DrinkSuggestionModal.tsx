import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { X, GlassWater, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Drink {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
}

interface DrinkSuggestionModalProps {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onSelectDrink: (drink: Drink) => void;
  onSkip: () => void;
}

async function fetchDrinks(storeId: string): Promise<Drink[]> {
  // First try to find a "bebidas" category
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .or("slug.ilike.%bebida%,name.ilike.%bebida%,slug.ilike.%drink%,name.ilike.%drink%,slug.ilike.%refrigerante%,name.ilike.%refrigerante%");

  if (!categories || categories.length === 0) {
    return [];
  }

  const categoryIds = categories.map(c => c.id);

  // Fetch products from those categories
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

export default function DrinkSuggestionModal({
  open,
  storeId,
  onClose,
  onSelectDrink,
  onSkip,
}: DrinkSuggestionModalProps) {
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  const { data: drinks = [], isLoading } = useQuery({
    queryKey: ["drinks-suggestion", storeId],
    queryFn: () => fetchDrinks(storeId),
    enabled: open && !!storeId,
    staleTime: 5 * 60 * 1000,
  });

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDrink(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (selectedDrink) {
      onSelectDrink(selectedDrink);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] bg-white rounded-t-3xl flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
              {/* Handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl">🥤</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-gray-900">Que tal uma bebida gelada?</h2>
                    <p className="text-sm text-gray-500">Complete sua experiência! 😎</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drinks List */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : drinks.length === 0 ? (
                <div className="text-center py-8">
                  <GlassWater className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nenhuma bebida disponível</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {drinks.map((drink) => {
                    const isSelected = selectedDrink?.id === drink.id;
                    const effectivePrice = drink.promotional_price ?? drink.price;
                    
                    return (
                      <button
                        key={drink.id}
                        onClick={() => setSelectedDrink(isSelected ? null : drink)}
                        className={cn(
                          "relative flex flex-col rounded-xl overflow-hidden transition-all",
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2"
                            : "border border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {/* Image */}
                        <div className="aspect-square bg-gray-100 relative">
                          {drink.image_url ? (
                            <img 
                              src={drink.image_url} 
                              alt={drink.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">
                              🥤
                            </div>
                          )}
                          
                          {/* Selected checkmark */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          
                          {/* Promo badge */}
                          {drink.promotional_price && drink.promotional_price < drink.price && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                              PROMO
                            </div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="p-2 text-left bg-white">
                          <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{drink.name}</h4>
                          <div className="flex items-center gap-1">
                            {drink.promotional_price && drink.promotional_price < drink.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(drink.price)}
                              </span>
                            )}
                            <span className="text-sm font-bold text-primary">
                              {formatCurrency(effectivePrice)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
              {selectedDrink ? (
                <Button
                  onClick={handleConfirm}
                  className="w-full h-14 text-lg font-bold"
                >
                  Adicionar {selectedDrink.name} • {formatCurrency(selectedDrink.promotional_price ?? selectedDrink.price)}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onSkip}
                    className="flex-1 h-14 text-base font-medium"
                  >
                    Sem bebida
                  </Button>
                  <Button
                    onClick={onSkip}
                    className="flex-1 h-14 text-base font-bold bg-green-500 hover:bg-green-600"
                  >
                    Escolher bebida
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
