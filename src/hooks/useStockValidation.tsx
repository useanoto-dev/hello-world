// Hook for validating stock before adding to cart
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StockValidationResult {
  isValid: boolean;
  availableQuantity: number;
  message?: string;
}

export function useStockValidation() {
  // Validate stock for a product
  const validateStock = useCallback(async (
    productId: string,
    requestedQuantity: number,
    currentCartQuantity: number = 0
  ): Promise<StockValidationResult> => {
    // Skip validation for virtual products
    if (
      productId.startsWith('primary-option-') || 
      productId.startsWith('standard-size-') ||
      productId.startsWith('pizza-')
    ) {
      return { isValid: true, availableQuantity: 999 };
    }

    const totalRequested = requestedQuantity + currentCartQuantity;

    // Check inventory products
    if (productId.startsWith('inv-')) {
      const realId = productId.replace('inv-', '');
      const { data, error } = await supabase
        .from("inventory_products")
        .select("stock_quantity, name")
        .eq("id", realId)
        .maybeSingle();

      if (error || !data) {
        return { isValid: true, availableQuantity: 999 };
      }

      const available = data.stock_quantity || 0;
      if (totalRequested > available) {
        return {
          isValid: false,
          availableQuantity: available,
          message: available === 0 
            ? `"${data.name}" está esgotado` 
            : `Apenas ${available} unidade(s) disponível(is) de "${data.name}"`
        };
      }

      return { isValid: true, availableQuantity: available };
    }

    // Check regular products with stock control
    const { data, error } = await supabase
      .from("products")
      .select("has_stock_control, stock_quantity, name")
      .eq("id", productId)
      .maybeSingle();

    if (error || !data) {
      return { isValid: true, availableQuantity: 999 };
    }

    // If no stock control, always valid
    if (!data.has_stock_control) {
      return { isValid: true, availableQuantity: 999 };
    }

    const available = data.stock_quantity || 0;
    if (totalRequested > available) {
      return {
        isValid: false,
        availableQuantity: available,
        message: available === 0 
          ? `"${data.name}" está esgotado` 
          : `Apenas ${available} unidade(s) disponível(is) de "${data.name}"`
      };
    }

    return { isValid: true, availableQuantity: available };
  }, []);

  // Validate and show toast if invalid
  const validateAndNotify = useCallback(async (
    productId: string,
    requestedQuantity: number,
    currentCartQuantity: number = 0
  ): Promise<boolean> => {
    const result = await validateStock(productId, requestedQuantity, currentCartQuantity);
    
    if (!result.isValid && result.message) {
      toast.error(result.message);
    }
    
    return result.isValid;
  }, [validateStock]);

  // Batch validate multiple products
  const validateBatch = useCallback(async (
    items: Array<{ productId: string; quantity: number }>
  ): Promise<{ isValid: boolean; invalidItems: string[] }> => {
    const invalidItems: string[] = [];
    
    for (const item of items) {
      const result = await validateStock(item.productId, item.quantity);
      if (!result.isValid) {
        invalidItems.push(item.productId);
      }
    }
    
    return {
      isValid: invalidItems.length === 0,
      invalidItems
    };
  }, [validateStock]);

  return {
    validateStock,
    validateAndNotify,
    validateBatch,
  };
}
