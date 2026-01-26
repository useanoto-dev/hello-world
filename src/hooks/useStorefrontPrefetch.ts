// Hook to prefetch category data AND images in the background for instant navigation
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { preloadImages } from "@/lib/imageCache";
import type { Category } from "./useStorefrontData";

interface PrefetchParams {
  categories: Category[];
  storeId: string | undefined;
}

// Fetchers for each category type
async function fetchPizzaSizes(categoryId: string) {
  const { data, error } = await supabase
    .from("pizza_sizes")
    .select("*")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return data || [];
}

async function fetchBeverageTypes(categoryId: string) {
  const { data, error } = await supabase
    .from("beverage_types")
    .select("id, name, description, icon, image_url, is_active, display_order")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return data || [];
}

async function fetchStandardSizes(categoryId: string) {
  const { data, error } = await supabase
    .from("standard_sizes")
    .select("id, name, base_price, description, image_url")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return data || [];
}

async function fetchStandardItems(categoryId: string) {
  const { data, error } = await supabase
    .from("standard_items")
    .select("id, name, description, image_url, item_type, is_premium")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return data || [];
}

async function fetchStandardItemPrices(itemIds: string[]) {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("standard_item_prices")
    .select("item_id, size_id, price, is_available")
    .in("item_id", itemIds)
    .eq("is_available", true);
  if (error) throw error;
  return data || [];
}

async function fetchCategorySettings(categoryId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("display_mode, allow_quantity_selector")
    .eq("id", categoryId)
    .single();
  if (error) throw error;
  return data;
}

export function useStorefrontPrefetch({ categories, storeId }: PrefetchParams) {
  const queryClient = useQueryClient();
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!storeId || categories.length === 0) return;

    // Prefetch all category data in background with low priority
    const prefetchAll = async () => {
      for (const category of categories) {
        // Skip already prefetched categories
        if (prefetchedRef.current.has(category.id)) continue;
        prefetchedRef.current.add(category.id);

        const categoryType = category.category_type;

        // Use requestIdleCallback for low-priority prefetching (or setTimeout fallback)
        const scheduleTask = (fn: () => void) => {
          if ("requestIdleCallback" in window) {
            (window as any).requestIdleCallback(fn, { timeout: 3000 });
          } else {
            setTimeout(fn, 100);
          }
        };

        if (categoryType === "pizza") {
          scheduleTask(async () => {
            const sizes = await queryClient.fetchQuery({
              queryKey: ["pizza-sizes", category.id],
              queryFn: () => fetchPizzaSizes(category.id),
              staleTime: 5 * 60 * 1000,
            });
            // Prefetch pizza size images
            if (sizes && sizes.length > 0) {
              const imageUrls = sizes.map((s: any) => s.image_url).filter(Boolean);
              preloadImages(imageUrls);
            }
          });
        } else if (categoryType === "beverages") {
          scheduleTask(async () => {
            const types = await queryClient.fetchQuery({
              queryKey: ["beverage-types", category.id],
              queryFn: () => fetchBeverageTypes(category.id),
              staleTime: 2 * 60 * 1000,
            });
            // Prefetch beverage type images
            if (types && types.length > 0) {
              const imageUrls = types.map((t: any) => t.image_url).filter(Boolean);
              preloadImages(imageUrls);
            }
          });
        } else if (categoryType === "standard") {
          scheduleTask(async () => {
            // Prefetch settings
            queryClient.prefetchQuery({
              queryKey: ["category-settings", category.id],
              queryFn: () => fetchCategorySettings(category.id),
              staleTime: 5 * 60 * 1000,
            });

            // Prefetch sizes and their images
            const sizes = await queryClient.fetchQuery({
              queryKey: ["standard-sizes", category.id],
              queryFn: () => fetchStandardSizes(category.id),
              staleTime: 5 * 60 * 1000,
            });
            if (sizes && sizes.length > 0) {
              const sizeImageUrls = sizes.map((s: any) => s.image_url).filter(Boolean);
              preloadImages(sizeImageUrls);
            }

            // Prefetch items and their images + prices
            const items = await queryClient.fetchQuery({
              queryKey: ["standard-items", category.id],
              queryFn: () => fetchStandardItems(category.id),
              staleTime: 5 * 60 * 1000,
            });

            if (items && items.length > 0) {
              // Prefetch item images
              const itemImageUrls = items.map((i: any) => i.image_url).filter(Boolean);
              preloadImages(itemImageUrls);

              const itemIds = items.map((i: any) => i.id);
              queryClient.prefetchQuery({
                queryKey: ["standard-item-prices", category.id],
                queryFn: () => fetchStandardItemPrices(itemIds),
                staleTime: 5 * 60 * 1000,
              });
            }
          });
        }
      }
    };

    // Start prefetching after a small delay to not block initial render
    const timeoutId = setTimeout(prefetchAll, 300);

    return () => clearTimeout(timeoutId);
  }, [categories, storeId, queryClient]);
}
