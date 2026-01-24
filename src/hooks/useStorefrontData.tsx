// Hook for fetching store and content data for storefront
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  use_sequential_flow: boolean;
  has_base_product: boolean | null;
  category_type: string | null;
  show_flavor_prices?: boolean;
  display_mode?: "cards" | "list";
  allow_quantity_selector?: boolean;
}

export interface Product {
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

export interface PrimaryGroupItem {
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

interface CategoryOptionGroup {
  id: string;
  category_id: string;
  is_primary: boolean;
}

// Fetch store data with all fields needed for display
export async function fetchStoreData(slug: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url, banner_url, primary_color, secondary_color, font_family, address, phone, whatsapp, instagram, open_hour, close_hour, is_open_override, about_us, estimated_prep_time, estimated_delivery_time, google_maps_link, schedule, min_order_value, use_comanda_mode")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// Fetch categories, products and option groups
export async function fetchStoreContent(storeId: string) {
  const [categoriesResult, productsResult, optionGroupsResult, reviewsResult, inventoryCategoriesResult, inventoryProductsResult, flowStepsResult, standardSizesResult] = await Promise.all([
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

  // Map inventory categories to standard category format
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

  // Map inventory products to standard product format
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

  // Build flow steps map by category
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

  // Create virtual products from standard_sizes for standard categories
  const standardSizeProducts: Product[] = (standardSizesResult.data || []).map((size: any) => ({
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

  // Track which categories have standard sizes
  const standardCategoryIds = new Set<string>(
    (standardSizesResult.data || []).map((s: any) => s.category_id)
  );

  return {
    categories: [...(categoriesResult.data || []) as Category[], ...inventoryCategories],
    products: [...(productsResult.data || []) as Product[], ...inventoryProducts, ...standardSizeProducts],
    categoryHasOptions,
    primaryGroupItems,
    reviewStats,
    inventoryProductIds: new Set(inventoryProducts.map(p => p.id)),
    flowStepsData,
    standardCategoryIds,
  };
}

export function useStorefrontData(slug: string | undefined) {
  const queryClient = useQueryClient();
  const [updatedProductIds, setUpdatedProductIds] = useState<Set<string>>(new Set());

  // Fetch store with aggressive caching
  const { data: store, isLoading: storeLoading, refetch: refetchStore } = useQuery({
    queryKey: ["store", slug],
    queryFn: () => fetchStoreData(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch content after store loads
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
      .channel('storefront-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const productId = payload.new?.id;
          if (productId) {
            setUpdatedProductIds(prev => new Set([...prev, productId]));
            setTimeout(() => {
              setUpdatedProductIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
              });
            }, 2500);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["store-content", store.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => 
        queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_option_items' }, () => 
        queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_products' }, () => 
        queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beverage_types' }, () => 
        queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beverage_products' }, () => 
        queryClient.invalidateQueries({ queryKey: ["store-content", store.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, queryClient]);

  return {
    store,
    storeLoading,
    refetchStore,
    content,
    contentLoading,
    refetchContent,
    updatedProductIds,
    loading: storeLoading || (!!store && contentLoading),
  };
}
