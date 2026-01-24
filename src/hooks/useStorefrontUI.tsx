// Hook for storefront UI state management
import { useState, useCallback, useMemo, useEffect } from "react";
import type { NavigationTab } from "@/components/storefront/BottomNavigation";
import type { Category, Product, PrimaryGroupItem } from "./useStorefrontData";
import type { PriceFilter, SortOption } from "@/components/storefront/ProductFilters";
import { supabase } from "@/integrations/supabase/client";
import { parseSchedule, isStoreOpenNow, getNextOpeningTime } from "@/lib/scheduleUtils";

const STORAGE_KEY = "storefront_active_tab";

export function useStorefrontUI(storeId: string | undefined, storeSchedule: unknown, storeOverride: boolean | null, openHour: number | null, closeHour: number | null) {
  // Tab state
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as NavigationTab) || "cardapio";
  });
  
  // Category state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Pending orders count
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  
  // Refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore vibration errors
    }
  }, []);
  
  // Tab change handler
  const handleTabChange = useCallback((tab: NavigationTab) => {
    triggerHaptic();
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  }, [triggerHaptic]);
  
  // Search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) {
      setActiveCategory(null);
    }
  }, []);
  
  // Parse and check if store is open
  const parsedSchedule = useMemo(() => {
    if (!storeSchedule) return null;
    return parseSchedule(storeSchedule);
  }, [storeSchedule]);

  const storeStatus = useMemo(() => {
    if (!parsedSchedule) return { isOpen: false, statusText: "Fechado" };
    return isStoreOpenNow(parsedSchedule, storeOverride, openHour ?? undefined, closeHour ?? undefined);
  }, [parsedSchedule, storeOverride, openHour, closeHour]);

  const nextOpeningTime = useMemo(() => {
    if (storeStatus.isOpen || !parsedSchedule) return null;
    return getNextOpeningTime(parsedSchedule);
  }, [storeStatus.isOpen, parsedSchedule]);
  
  // Fetch pending orders count
  useEffect(() => {
    if (!storeId) return;
    
    const fetchPendingOrders = async () => {
      const savedPhone = localStorage.getItem("customer_phone");
      if (!savedPhone) return;
      
      const cleanPhone = savedPhone.replace(/\D/g, "");
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .or(`customer_phone.eq.${cleanPhone},customer_phone.ilike.%${cleanPhone}%`)
        .in("status", ["pending", "confirmed", "preparing", "ready", "delivering"]);
      
      setPendingOrdersCount(count || 0);
    };

    fetchPendingOrders();
    
    const channel = supabase
      .channel("customer-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        () => fetchPendingOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);
  
  return {
    // Tab state
    activeTab,
    handleTabChange,
    
    // Category state
    activeCategory,
    setActiveCategory,
    
    // Filter state
    searchQuery,
    handleSearch,
    priceFilter,
    setPriceFilter,
    sortOption,
    setSortOption,
    showPromoOnly,
    setShowPromoOnly,
    showFavoritesOnly,
    setShowFavoritesOnly,
    
    // Store status
    storeStatus,
    nextOpeningTime,
    
    // Pending orders
    pendingOrdersCount,
    
    // Refresh
    isRefreshing,
    setIsRefreshing,
    triggerHaptic,
  };
}

// Helper to check if promotion is currently active
export function isPromotionActive(item: PrimaryGroupItem): boolean {
  if (item.promotional_price === null || item.promotional_price >= item.additional_price) {
    return false;
  }
  const now = new Date();
  if (item.promotion_start_at) {
    const startDate = new Date(item.promotion_start_at);
    if (now < startDate) return false;
  }
  if (item.promotion_end_at) {
    const endDate = new Date(item.promotion_end_at);
    if (now > endDate) return false;
  }
  return true;
}

// Create virtual products from primary group items
export function createVirtualProducts(
  categories: Category[],
  categoryHasOptions: Map<string, boolean>,
  primaryGroupItems: Record<string, PrimaryGroupItem[]>
) {
  const virtualProducts: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    promotional_price: number | null;
    image_url: string | null;
    category_id: string;
    is_featured: boolean;
    isVirtualProduct: boolean;
    primaryOptionId: string;
  }> = [];
  
  categories
    .filter(cat => categoryHasOptions.has(cat.id))
    .forEach(cat => {
      const primaryItems = primaryGroupItems[cat.id] || [];
      
      primaryItems.forEach(item => {
        const hasActivePromo = isPromotionActive(item);
        virtualProducts.push({
          id: `primary-option-${item.id}`,
          name: item.name,
          description: item.description,
          price: item.additional_price || 0,
          promotional_price: hasActivePromo ? item.promotional_price : null,
          image_url: item.image_url || cat.image_url,
          category_id: cat.id,
          is_featured: false,
          isVirtualProduct: true,
          primaryOptionId: item.id,
        });
      });
    });
  
  return virtualProducts;
}

// Filter and sort products
export function filterAndSortProducts(
  allProducts: Array<Product & { isVirtualProduct?: boolean }>,
  options: {
    searchQuery: string;
    effectiveCategory: string | null;
    showPromoOnly: boolean;
    priceFilter: PriceFilter;
    sortOption: SortOption;
  }
) {
  const { searchQuery, effectiveCategory, showPromoOnly, priceFilter, sortOption } = options;
  
  return allProducts
    .filter(p => {
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !effectiveCategory || p.category_id === effectiveCategory;
      
      if (showPromoOnly && !p.isVirtualProduct) {
        const hasPromo = p.promotional_price !== null && p.promotional_price < p.price;
        if (!hasPromo) return false;
      }
      
      if (p.isVirtualProduct) {
        return matchesSearch && matchesCategory;
      }
      
      const effectivePrice = p.promotional_price ?? p.price;
      const matchesPrice = 
        priceFilter === "all" ||
        (priceFilter === "under20" && effectivePrice < 20) ||
        (priceFilter === "20to40" && effectivePrice >= 20 && effectivePrice <= 40) ||
        (priceFilter === "over40" && effectivePrice > 40);
      
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      if (a.isVirtualProduct && !b.isVirtualProduct) return -1;
      if (!a.isVirtualProduct && b.isVirtualProduct) return 1;
      
      const priceA = a.promotional_price ?? a.price;
      const priceB = b.promotional_price ?? b.price;
      
      switch (sortOption) {
        case "price_asc": return priceA - priceB;
        case "price_desc": return priceB - priceA;
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });
}
