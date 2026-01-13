import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePendingOrdersCount(storeId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!storeId) return;

    // Fetch initial count
    const fetchCount = async () => {
      const { count: pendingCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .in("status", ["pending", "confirmed", "preparing"]);

      setCount(pendingCount || 0);
    };

    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("pending-orders-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          // Refetch count on any change
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  return count;
}
