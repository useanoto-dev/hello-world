// Custom hook for fetching store content with optimized caching
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useCallback, useRef } from "react";

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  open_hour: number | null;
  close_hour: number | null;
  is_open_override: boolean | null;
  about_us: string | null;
  estimated_prep_time: number | null;
  estimated_delivery_time: number | null;
  google_maps_link: string | null;
  min_order_value: number | null;
  schedule?: unknown;
  use_comanda_mode?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  use_sequential_flow: boolean;
  has_base_product: boolean | null;
  category_type: string | null;
  show_flavor_prices?: boolean;
  display_mode?: "cards" | "list" | null;
  allow_quantity_selector?: boolean | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_id: string;
  is_featured: boolean | null;
  stock_quantity?: number | null;
  min_stock_alert?: number | null;
  has_stock_control?: boolean | null;
}

interface CategoryOptionGroup {
  id: string;
  category_id: string;
  is_primary: boolean;
}

interface PrimaryGroupItem {
  id: string;
  group_id: string;
  name: string;
  additional_price: number;
  promotional_price: number | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
  image_url: string | null;
  description: string | null;
}

interface StandardSize {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
}

interface StandardItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  item_type: string;
  is_premium: boolean;
  is_active: boolean;
}

interface StandardItemPrice {
  id: string;
  item_id: string;
  size_id: string;
  price: number;
  is_available: boolean;
}

// Fetch store data using secure public view (excludes sensitive fields like pix_key, api tokens)
async function fetchStoreData(slug: string) {
  const { data, error } = await supabase
    .from("v_public_stores")
    .select("id, name, slug, logo_url, banner_url, primary_color, secondary_color, font_family, address, phone, whatsapp, instagram, open_hour, close_hour, is_open_override, about_us, estimated_prep_time, estimated_delivery_time, google_maps_link, schedule, min_order_value")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  
  if (error) throw error;
  return data as Store | null;
}

// Fetch all store content
async function fetchStoreContent(storeId: string) {
  const [
    categoriesResult, 
    productsResult, 
    optionGroupsResult, 
    reviewsResult, 
    inventoryCategoriesResult, 
    inventoryProductsResult, 
    flowStepsResult, 
    standardSizesResult,
    standardItemsResult,
    standardItemPricesResult
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, image_url, use_sequential_flow, has_base_product, category_type, show_flavor_prices, display_mode, allow_quantity_selector")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("products")
      .select("id, name, description, price, promotional_price, image_url, category_id, is_featured, stock_quantity, min_stock_alert, has_stock_control")
      .eq("store_id", storeId)
      .eq("is_available", true)
      .order("display_order"),
    supabase
      .from("category_option_groups")
      .select("id, category_id, is_primary")
      .eq("store_id", storeId)
      .eq("is_active", true),
    supabase
      .from("reviews")
      .select("rating")
      .eq("store_id", storeId),
    supabase
      .from("inventory_categories")
      .select("id, name, icon, is_active")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("inventory_products")
      .select("id, name, description, price, promotional_price, image_url, category_id, stock_quantity, min_stock_alert")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .order("display_order"),
    supabase
      .from("pizza_flow_steps")
      .select("category_id, step_type, is_enabled, step_order, next_step_id")
      .eq("store_id", storeId),
    supabase
      .from("standard_sizes")
      .select("id, category_id, name, description, base_price, image_url, is_active")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order"),
    // Fetch standard items
    supabase
      .from("standard_items")
      .select("id, category_id, name, description, image_url, item_type, is_premium, is_active")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order"),
    // Fetch standard item prices
    supabase
      .from("standard_item_prices")
      .select("id, item_id, size_id, price, is_available")
      .eq("is_available", true),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;
  if (optionGroupsResult.error) throw optionGroupsResult.error;

  // Calculate review stats
  const reviews = reviewsResult.data || [];
  const reviewStats = {
    averageRating: reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0,
    totalReviews: reviews.length
  };

  // Build a map of categories that have option groups
  const categoryHasOptions = new Map<string, boolean>();
  const primaryGroupIds: string[] = [];
  
  (optionGroupsResult.data || []).forEach((group: CategoryOptionGroup) => {
    categoryHasOptions.set(group.category_id, true);
    if (group.is_primary) {
      primaryGroupIds.push(group.id);
    }
  });

  // Fetch items from primary groups for display on cards
  let primaryGroupItems: Record<string, PrimaryGroupItem[]> = {};
  
  if (primaryGroupIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("category_option_items")
      .select("id, group_id, name, additional_price, promotional_price, promotion_start_at, promotion_end_at, image_url, description")
      .in("group_id", primaryGroupIds)
      .eq("is_active", true)
      .order("display_order");
    
    const groupToCategoryMap = new Map<string, string>();
    (optionGroupsResult.data || []).forEach((group: CategoryOptionGroup) => {
      if (group.is_primary) {
        groupToCategoryMap.set(group.id, group.category_id);
      }
    });
    
    (itemsData || []).forEach((item: PrimaryGroupItem) => {
      const categoryId = groupToCategoryMap.get(item.group_id);
      if (categoryId) {
        if (!primaryGroupItems[categoryId]) {
          primaryGroupItems[categoryId] = [];
        }
        primaryGroupItems[categoryId].push(item);
      }
    });
  }

  // Map inventory categories
  const inventoryCategories: Category[] = (inventoryCategoriesResult.data || []).map(cat => ({
    id: `inv-${cat.id}`,
    name: cat.name,
    slug: `estoque-${cat.id}`,
    icon: cat.icon,
    image_url: null,
    use_sequential_flow: false,
    has_base_product: false,
    category_type: null,
  }));

  // Map inventory products
  const inventoryProducts: Product[] = (inventoryProductsResult.data || []).map(prod => ({
    id: `inv-${prod.id}`,
    name: prod.name,
    description: prod.description,
    price: prod.price,
    promotional_price: prod.promotional_price,
    image_url: prod.image_url,
    category_id: `inv-${prod.category_id}`,
    is_featured: false,
    stock_quantity: prod.stock_quantity,
    min_stock_alert: prod.min_stock_alert,
    has_stock_control: true,
  }));

  // Build flow steps map
  const flowStepsData: Record<string, Record<string, { is_enabled: boolean; next_step_id: string | null }>> = {};
  (flowStepsResult.data || []).forEach((step: any) => {
    if (!flowStepsData[step.category_id]) {
      flowStepsData[step.category_id] = {};
    }
    flowStepsData[step.category_id][step.step_type] = {
      is_enabled: step.is_enabled,
      next_step_id: step.next_step_id,
    };
  });

  // Build standard item prices map
  const standardItemPricesMap = new Map<string, Map<string, number>>();
  (standardItemPricesResult.data || []).forEach((price: StandardItemPrice) => {
    if (!standardItemPricesMap.has(price.item_id)) {
      standardItemPricesMap.set(price.item_id, new Map());
    }
    standardItemPricesMap.get(price.item_id)!.set(price.size_id, price.price);
  });

  // Create virtual products from standard_sizes
  const standardSizeProducts: Product[] = (standardSizesResult.data || []).map((size: StandardSize) => ({
    id: `standard-size-${size.id}`,
    name: size.name,
    description: size.description,
    price: size.base_price || 0,
    promotional_price: null,
    image_url: size.image_url,
    category_id: size.category_id,
    is_featured: false,
    stock_quantity: null,
    min_stock_alert: null,
    has_stock_control: false,
  }));

  // Track standard category IDs
  const standardCategoryIds = new Set<string>(
    (standardSizesResult.data || []).map((s: StandardSize) => s.category_id)
  );

  // Standard items data
  const standardItems = (standardItemsResult.data || []) as StandardItem[];
  const standardSizes = (standardSizesResult.data || []) as StandardSize[];

  return {
    categories: [...(categoriesResult.data || []) as Category[], ...inventoryCategories],
    products: [...(productsResult.data || []) as Product[], ...inventoryProducts, ...standardSizeProducts],
    categoryHasOptions,
    primaryGroupItems,
    reviewStats,
    inventoryProductIds: new Set(inventoryProducts.map(p => p.id)),
    flowStepsData,
    standardCategoryIds,
    standardItems,
    standardSizes,
    standardItemPricesMap,
  };
}

export function useStoreContent(slug: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch store
  const { data: store, isLoading: storeLoading, refetch: refetchStore } = useQuery({
    queryKey: ["store", slug],
    queryFn: () => fetchStoreData(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch content
  const { data: content, isLoading: contentLoading, refetch: refetchContent } = useQuery({
    queryKey: ["store-content", store?.id],
    queryFn: () => fetchStoreContent(store!.id),
    enabled: !!store?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Real-time subscription for updates
  useEffect(() => {
    if (!store?.id) return;

    const channel = supabase
      .channel('storefront-realtime-hook')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        () => queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'category_option_items' },
        () => queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inventory_products' },
        () => queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pizza_flow_steps' },
        () => queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, queryClient]);

  const loading = storeLoading || (!!store && contentLoading);

  const categories = content?.categories || [];
  const products = content?.products || [];
  const categoryHasOptions = content?.categoryHasOptions || new Map<string, boolean>();
  const primaryGroupItems = content?.primaryGroupItems || {};
  const reviewStats = content?.reviewStats;
  const flowStepsData = content?.flowStepsData || {};
  const standardCategoryIds = content?.standardCategoryIds || new Set<string>();
  const standardItems = content?.standardItems || [];
  const standardSizes = content?.standardSizes || [];
  const standardItemPricesMap = content?.standardItemPricesMap || new Map();

  // Flow step helpers
  const flowStepsDataRef = useRef(flowStepsData);
  useEffect(() => {
    flowStepsDataRef.current = flowStepsData;
  }, [flowStepsData]);

  const isStepEnabled = useCallback((categoryId: string, stepType: string): boolean => {
    const data = flowStepsDataRef.current;
    const categorySteps = data[categoryId];
    if (!categorySteps) return true;
    const stepData = categorySteps[stepType];
    if (!stepData) return true;
    return stepData.is_enabled;
  }, []);

  const getNextStep = useCallback((categoryId: string, currentStepType: string): string | null => {
    const data = flowStepsDataRef.current;
    const categorySteps = data[categoryId];
    if (!categorySteps) return null;
    const stepData = categorySteps[currentStepType];
    if (!stepData) return null;
    return stepData.next_step_id;
  }, []);

  const navigateToNextStep = useCallback((categoryId: string, currentStepType: string): string | null => {
    let nextStep = getNextStep(categoryId, currentStepType);
    
    while (nextStep && nextStep !== 'cart') {
      if (isStepEnabled(categoryId, nextStep)) {
        return nextStep;
      }
      nextStep = getNextStep(categoryId, nextStep);
    }
    
    return nextStep;
  }, [getNextStep, isStepEnabled]);

  // Promotion check helper
  const isPromotionActive = useCallback((item: PrimaryGroupItem): boolean => {
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
  }, []);

  // Virtual products from primary groups
  const categoryProducts = useMemo(() => {
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
  }, [categories, categoryHasOptions, primaryGroupItems, isPromotionActive]);

  // Combined products
  const allProducts = useMemo(() => {
    const realProducts = products.map(p => ({ ...p, isVirtualProduct: false }));
    return [...realProducts, ...categoryProducts];
  }, [products, categoryProducts]);

  const refresh = useCallback(async () => {
    await Promise.all([refetchStore(), refetchContent()]);
  }, [refetchStore, refetchContent]);

  return {
    store,
    loading,
    categories,
    products,
    allProducts,
    categoryHasOptions,
    primaryGroupItems,
    reviewStats,
    flowStepsData,
    standardCategoryIds,
    standardItems,
    standardSizes,
    standardItemPricesMap,
    isStepEnabled,
    getNextStep,
    navigateToNextStep,
    isPromotionActive,
    refresh,
    queryClient,
  };
}

export type { Store, Category, Product, PrimaryGroupItem, StandardSize, StandardItem };
