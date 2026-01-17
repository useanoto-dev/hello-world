// Minimum order banner component for checkout flow
import { AlertCircle, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface MinOrderBannerProps {
  minOrderValue: number;
  currentTotal: number;
  storeSlug?: string;
  className?: string;
}

export function MinOrderBanner({ 
  minOrderValue, 
  currentTotal, 
  storeSlug,
  className = "" 
}: MinOrderBannerProps) {
  const navigate = useNavigate();
  const remainingAmount = Math.max(0, minOrderValue - currentTotal);
  const progressPercent = Math.min(100, (currentTotal / minOrderValue) * 100);
  const isValid = currentTotal >= minOrderValue;

  if (isValid || minOrderValue <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-amber-800 text-sm">
            Pedido mínimo não atingido
          </h4>
          <p className="text-amber-700 text-xs mt-1">
            Adicione mais {formatCurrency(remainingAmount)} para continuar
          </p>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-amber-600 mb-1">
              <span>{formatCurrency(currentTotal)}</span>
              <span>Mínimo: {formatCurrency(minOrderValue)}</span>
            </div>
            <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-amber-500 rounded-full"
              />
            </div>
          </div>

          {storeSlug && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-amber-700 border-amber-300 hover:bg-amber-100"
              onClick={() => navigate(`/cardapio/${storeSlug}`)}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Adicionar mais itens
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Compact version for checkout summary
export function MinOrderCompactBanner({ 
  minOrderValue, 
  currentTotal 
}: { minOrderValue: number; currentTotal: number }) {
  const remainingAmount = Math.max(0, minOrderValue - currentTotal);
  const isValid = currentTotal >= minOrderValue;

  if (isValid || minOrderValue <= 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="text-xs text-amber-700">
        Faltam <strong>{formatCurrency(remainingAmount)}</strong> para o pedido mínimo de {formatCurrency(minOrderValue)}
      </span>
    </div>
  );
}
