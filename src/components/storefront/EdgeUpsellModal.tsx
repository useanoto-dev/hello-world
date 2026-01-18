// Edge Upsell Modal - Compact version showing pizza edges with prices per size
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
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
  categoryId,
  sizeId,
  sizeName,
  title = "Escolha a Borda",
  description,
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

        {/* Compact Edges List */}
        <div className="px-4 pb-3 max-h-[40vh] overflow-y-auto">
          <div className="space-y-1.5">
            {/* No edge option */}
            <button
              onClick={() => { setSelectedEdge(null); handleSkip(); }}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                selectedEdge === null
                  ? "bg-muted/50 border-primary/50"
                  : "bg-card border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🚫</span>
                <span className="font-medium text-sm text-foreground">Sem Borda</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Grátis</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>

            {edges.map((edge) => {
              const isSelected = selectedEdge?.id === edge.id;
              
              return (
                <button
                  key={edge.id}
                  onClick={() => { setSelectedEdge(edge); onSelectEdge(edge); }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                    isSelected
                      ? "bg-muted/50 border-primary/50"
                      : "bg-card border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧀</span>
                    <span className="font-medium text-[15px] text-gray-800">{edge.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-normal text-gray-500">
                      +{formatCurrency(edge.price)}
                    </span>
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
