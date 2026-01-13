import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Package } from "lucide-react";

interface UseStockNotificationsProps {
  storeId: string | null | undefined;
  enabled?: boolean;
}

/**
 * Consolidated hook for stock notifications
 * Monitors both inventory_products and products tables for low/critical stock
 */
export function useStockNotifications({ storeId, enabled = true }: UseStockNotificationsProps) {
  const notifiedProducts = useRef<Set<string>>(new Set());
  const previousStockRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!storeId || !enabled) return;

    // Subscribe to inventory_products updates
    const inventoryChannel = supabase
      .channel(`stock-notifications-inventory-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_products',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const newStock = payload.new.stock_quantity as number;
          const minAlert = payload.new.min_stock_alert as number | null;
          const productName = payload.new.name as string;
          const productId = payload.new.id as string;
          const oldStock = payload.old?.stock_quantity as number | undefined;

          const effectiveMinAlert = minAlert ?? 0;
          const isCritical = newStock <= effectiveMinAlert;
          const wasCritical = oldStock !== undefined && oldStock <= effectiveMinAlert;

          // Only notify if stock just crossed the threshold
          if (isCritical && !wasCritical && effectiveMinAlert > 0) {
            const notifKey = `inv-${productId}`;
            if (notifiedProducts.current.has(notifKey)) return;

            notifiedProducts.current.add(notifKey);
            setTimeout(() => notifiedProducts.current.delete(notifKey), 30000);

            if (newStock === 0) {
              toast.error(`Estoque esgotado: ${productName}`, {
                description: "Este produto foi desativado automaticamente.",
                duration: 10000,
                icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
              });
            } else {
              toast.warning(`Estoque crítico: ${productName}`, {
                description: `Restam apenas ${newStock} unidades (mínimo: ${effectiveMinAlert})`,
                duration: 10000,
                icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
                action: {
                  label: "Ver Estoque",
                  onClick: () => {
                    window.location.href = "/dashboard/inventory";
                  }
                }
              });
            }
          }

          previousStockRef.current.set(`inv-${productId}`, newStock);
        }
      )
      .subscribe();

    // Subscribe to products (menu products with stock control) updates
    const productsChannel = supabase
      .channel(`stock-notifications-products-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const hasStockControl = payload.new.has_stock_control as boolean | null;
          if (!hasStockControl) return;

          const newStock = payload.new.stock_quantity as number | null;
          if (newStock === null) return;

          const minAlert = payload.new.min_stock_alert as number | null;
          const productName = payload.new.name as string;
          const productId = payload.new.id as string;
          const oldStock = payload.old?.stock_quantity as number | null | undefined;

          const effectiveMinAlert = minAlert ?? 0;
          const isCritical = newStock <= effectiveMinAlert;
          const wasCritical = oldStock !== undefined && oldStock !== null && oldStock <= effectiveMinAlert;

          // Only notify if stock just crossed the threshold
          if (isCritical && !wasCritical && effectiveMinAlert > 0) {
            if (notifiedProducts.current.has(productId)) return;

            notifiedProducts.current.add(productId);
            setTimeout(() => notifiedProducts.current.delete(productId), 30000);

            if (newStock === 0) {
              toast.error(`Produto esgotado: ${productName}`, {
                description: "Este produto foi desativado automaticamente no cardápio.",
                duration: 10000,
                icon: <Package className="h-5 w-5 text-destructive" />,
              });
            } else {
              toast.warning(`Estoque baixo: ${productName}`, {
                description: `Restam apenas ${newStock} unidades (mínimo: ${effectiveMinAlert})`,
                duration: 10000,
                icon: <Package className="h-5 w-5 text-amber-500" />,
                action: {
                  label: "Ver Cardápio",
                  onClick: () => {
                    window.location.href = "/dashboard/products";
                  }
                }
              });
            }
          }

          previousStockRef.current.set(productId, newStock);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [storeId, enabled]);
}
