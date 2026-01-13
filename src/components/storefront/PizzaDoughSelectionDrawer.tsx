import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DoughWithPrice {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface PizzaDoughSelectionDrawerProps {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  sizeId: string;
  sizeName: string;
  onComplete: (dough: DoughWithPrice | null) => void;
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

export function PizzaDoughSelectionDrawer({
  open,
  onClose,
  categoryId,
  sizeId,
  sizeName,
  onComplete,
}: PizzaDoughSelectionDrawerProps) {
  const [selectedDough, setSelectedDough] = useState<DoughWithPrice | null>(null);

  const { data: doughs = [], isLoading } = useQuery({
    queryKey: ["pizza-doughs", categoryId, sizeId],
    queryFn: () => fetchDoughsWithPrices(categoryId, sizeId),
    enabled: open && !!sizeId,
  });

  // Reset and auto-select first dough when drawer opens
  useEffect(() => {
    if (open && doughs.length > 0) {
      setSelectedDough(doughs[0]);
    } else if (open) {
      setSelectedDough(null);
    }
  }, [open, doughs]);

  // Auto-skip if no doughs available after loading
  useEffect(() => {
    if (open && !isLoading && doughs.length === 0) {
      onComplete(null);
    }
  }, [open, isLoading, doughs.length, onComplete]);

  const handleConfirm = () => {
    onComplete(selectedDough);
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
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] bg-white rounded-t-3xl flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
              {/* Handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="text-center flex-1">
                  <h2 className="font-bold text-lg text-gray-900">Escolha a Massa</h2>
                  <p className="text-sm text-gray-500">{sizeName}</p>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Doughs List */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : doughs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🍕</div>
                  <p className="text-gray-500">Nenhuma massa disponível</p>
                  <p className="text-sm text-gray-400 mt-1">Massa tradicional será usada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {doughs.map((dough) => {
                    const isSelected = selectedDough?.id === dough.id;
                    
                    return (
                      <button
                        key={dough.id}
                        onClick={() => setSelectedDough(dough)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl transition-all",
                          isSelected
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-white border border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🥖</span>
                          <div className="text-left">
                            <h4 className="font-medium text-gray-900">{dough.name}</h4>
                            {dough.description && (
                              <p className="text-sm text-gray-500 line-clamp-1">{dough.description}</p>
                            )}
                            {dough.price > 0 && (
                              <span className="text-sm text-primary font-semibold">
                                +{formatCurrency(dough.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-gray-300"
                        )}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white space-y-2">
              <Button
                onClick={handleConfirm}
                className="w-full h-14 text-lg font-bold"
                disabled={doughs.length > 0 && !selectedDough}
              >
                {selectedDough ? (
                  <>
                    Confirmar • {selectedDough.price > 0 ? `+${formatCurrency(selectedDough.price)}` : "Incluso"}
                  </>
                ) : doughs.length === 0 ? (
                  "Continuar"
                ) : (
                  "Selecione uma massa"
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
