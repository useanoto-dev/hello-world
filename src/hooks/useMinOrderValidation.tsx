// Hook for minimum order validation
import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";

interface MinOrderValidationResult {
  isValid: boolean;
  minOrderValue: number;
  currentTotal: number;
  remainingAmount: number;
  message?: string;
}

interface UseMinOrderValidationProps {
  storeMinOrder?: number | null;
  deliveryAreaMinOrder?: number | null;
  deliveryFee?: number;
}

export function useMinOrderValidation({
  storeMinOrder = 0,
  deliveryAreaMinOrder,
  deliveryFee = 0,
}: UseMinOrderValidationProps): MinOrderValidationResult {
  const { totalPrice } = useCart();

  return useMemo(() => {
    // Delivery area min order takes precedence if set
    const minOrderValue = deliveryAreaMinOrder !== undefined && deliveryAreaMinOrder !== null && deliveryAreaMinOrder > 0
      ? deliveryAreaMinOrder
      : (storeMinOrder || 0);

    const currentTotal = totalPrice;
    const remainingAmount = Math.max(0, minOrderValue - currentTotal);
    const isValid = currentTotal >= minOrderValue;

    const message = !isValid && minOrderValue > 0
      ? `Pedido mínimo de ${formatCurrency(minOrderValue)}. Faltam ${formatCurrency(remainingAmount)}.`
      : undefined;

    return {
      isValid,
      minOrderValue,
      currentTotal,
      remainingAmount,
      message,
    };
  }, [totalPrice, storeMinOrder, deliveryAreaMinOrder]);
}

// Component to display min order warning
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface MinOrderWarningProps {
  minOrderValue: number;
  currentTotal: number;
  remainingAmount: number;
}

export function MinOrderWarning({ minOrderValue, currentTotal, remainingAmount }: MinOrderWarningProps) {
  if (currentTotal >= minOrderValue || minOrderValue <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800"
    >
      <AlertCircle className="w-5 h-5 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-medium">Pedido mínimo: </span>
        <span>{formatCurrency(minOrderValue)}</span>
        <span className="text-amber-600"> • Faltam {formatCurrency(remainingAmount)}</span>
      </div>
    </motion.div>
  );
}
