// Edge Upsell Modal - Shows pizza edges from database with prices per size
// Beautiful bottom sheet design matching existing upsell modals
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface EdgeWithPrice {
  id: string;
  name: string;
  price: number;
}

interface EdgeUpsellModalProps {
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
  onSelectEdge: (edge: EdgeWithPrice | null) => void;
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

export default function EdgeUpsellModal({
  storeId,
  categoryId,
  sizeId,
  sizeName,
  title = "Escolha a Borda",
  description,
  buttonText = "Confirmar",
  buttonColor = "#f97316",
  secondaryButtonText = "Sem Borda",
  icon = "🧀",
  onClose,
  onSelectEdge,
}: EdgeUpsellModalProps) {
  const [loading, setLoading] = useState(true);
  const [edges, setEdges] = useState<EdgeWithPrice[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<EdgeWithPrice | null>(null);

  useEffect(() => {
    loadEdges();
  }, [categoryId, sizeId]);

  const loadEdges = async () => {
    try {
      const data = await fetchEdgesWithPrices(categoryId, sizeId);
      setEdges(data);
      
      // Auto-close if no edges available
      if (data.length === 0) {
        onSelectEdge(null);
      }
    } catch (error) {
      console.error("Error loading edges:", error);
      onSelectEdge(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onSelectEdge(selectedEdge);
  };

  const handleSkip = () => {
    onSelectEdge(null);
  };

  // Don't render if loading or no edges
  if (loading) {
    return null;
  }

  if (edges.length === 0) {
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
      />
      
      {/* Bottom sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">{icon}</span>
                <h2 className="font-bold text-lg text-foreground">{title}</h2>
              </div>
              {sizeName && (
                <p className="text-sm text-muted-foreground">Tamanho: {sizeName}</p>
              )}
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edges List */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
          <div className="space-y-2">
            {/* No edge option */}
            <button
              onClick={() => setSelectedEdge(null)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl transition-all border",
                selectedEdge === null
                  ? "bg-primary/10 border-primary"
                  : "bg-card border-border hover:border-muted-foreground/50"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚫</span>
                <span className="font-medium text-foreground">Sem Borda</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Grátis</span>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  selectedEdge === null
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                )}>
                  {selectedEdge === null && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </div>
            </button>

            {edges.map((edge) => {
              const isSelected = selectedEdge?.id === edge.id;
              
              return (
                <button
                  key={edge.id}
                  onClick={() => setSelectedEdge(edge)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl transition-all border",
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧀</span>
                    <span className="font-medium text-foreground">{edge.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: buttonColor }}
                    >
                      +{formatCurrency(edge.price)}
                    </span>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-border/50 bg-background space-y-3">
          <button
            onClick={handleConfirm}
            className="w-full h-14 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
            style={{ backgroundColor: buttonColor }}
          >
            {selectedEdge ? (
              <>
                {buttonText} • +{formatCurrency(selectedEdge.price)}
              </>
            ) : (
              <>Continuar sem borda</>
            )}
          </button>
          
          {selectedEdge && (
            <button
              onClick={handleSkip}
              className="w-full h-12 rounded-xl border-2 border-border bg-background hover:bg-muted font-medium text-sm transition-colors"
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
