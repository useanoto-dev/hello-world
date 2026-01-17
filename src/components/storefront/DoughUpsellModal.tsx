// Dough Upsell Modal - Shows pizza doughs with prices per size (integrated with pizza_doughs table)
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface DoughWithPrice {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface DoughUpsellModalProps {
  storeId: string;
  categoryId: string;
  sizeId: string;
  sizeName: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonColor?: string;
  secondaryButtonText?: string;
  icon?: string;
  onClose: () => void;
  onSelectDough: (dough: DoughWithPrice | null) => void;
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

export default function DoughUpsellModal({
  storeId,
  categoryId,
  sizeId,
  sizeName,
  title = "Escolha a Massa",
  description,
  buttonText = "Continuar",
  buttonColor = "#a855f7",
  secondaryButtonText = "Massa Tradicional",
  icon = "🥖",
  onClose,
  onSelectDough,
}: DoughUpsellModalProps) {
  const [loading, setLoading] = useState(true);
  const [doughs, setDoughs] = useState<DoughWithPrice[]>([]);
  const [selectedDough, setSelectedDough] = useState<DoughWithPrice | null>(null);

  useEffect(() => {
    loadDoughs();
  }, [categoryId, sizeId]);

  const loadDoughs = async () => {
    try {
      const data = await fetchDoughsWithPrices(categoryId, sizeId);
      setDoughs(data);
      
      // Auto-close if no doughs available
      if (data.length === 0) {
        onSelectDough(null);
      }
    } catch (error) {
      console.error("Error loading doughs:", error);
      onSelectDough(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onSelectDough(selectedDough);
  };

  const handleSkip = () => {
    onSelectDough(null);
  };

  // Don't render if loading or no doughs
  if (loading) {
    return null;
  }

  if (doughs.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={handleSkip}
      />
      
      {/* Compact bottom sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-2xl shadow-2xl"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Compact Header */}
        <div className="px-4 pb-2 flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div className="flex-1">
            <h2 className="font-semibold text-base text-foreground">{title}</h2>
            {sizeName && (
              <p className="text-xs text-muted-foreground">Tamanho {sizeName}</p>
            )}
          </div>
        </div>

        {/* Compact Doughs List */}
        <div className="px-4 pb-3 max-h-[40vh] overflow-y-auto">
          <div className="space-y-1.5">
            {/* No dough option (Traditional) */}
            <button
              onClick={() => { setSelectedDough(null); handleSkip(); }}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                selectedDough === null
                  ? "bg-muted/50 border-primary/50"
                  : "bg-card border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🍕</span>
                <div className="text-left">
                  <span className="font-medium text-sm text-foreground">Massa Tradicional</span>
                  <p className="text-xs text-muted-foreground">Massa padrão</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Incluso</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>

            {doughs.map((dough) => {
              const isSelected = selectedDough?.id === dough.id;
              
              return (
                <button
                  key={dough.id}
                  onClick={() => { setSelectedDough(dough); onSelectDough(dough); }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                    isSelected
                      ? "bg-muted/50 border-primary/50"
                      : "bg-card border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🥖</span>
                    <div className="text-left">
                      <span className="font-medium text-sm text-foreground">{dough.name}</span>
                      {dough.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{dough.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dough.price > 0 ? (
                      <span 
                        className="text-xs font-semibold"
                        style={{ color: buttonColor }}
                      >
                        +{formatCurrency(dough.price)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Incluso</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Minimal safe area padding */}
        <div className="h-4 bg-background" />
      </motion.div>
    </AnimatePresence>
  );
}
