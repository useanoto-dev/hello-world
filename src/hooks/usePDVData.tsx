import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Table {
  id: string;
  number: string;
  name: string | null;
  status: string;
  updated_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface OptionGroup {
  id: string;
  category_id: string;
  name: string;
  is_primary: boolean;
  is_active: boolean;
  is_required: boolean;
  selection_type: "single" | "multiple";
  min_selections: number;
  max_selections: number | null;
}

export interface ProductVariation {
  name: string;
  price: number;
}

export interface OptionItem {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  additional_price: number;
  promotional_price: number | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
  is_active: boolean;
  category_id?: string;
  category_name?: string;
  variations?: ProductVariation[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon_type: string;
}

// Helper to get current price (considering promotions)
export const getItemPrice = (item: OptionItem): number => {
  if (item.promotional_price !== null) {
    const now = new Date();
    const start = item.promotion_start_at ? new Date(item.promotion_start_at) : null;
    const end = item.promotion_end_at ? new Date(item.promotion_end_at) : null;
    
    if ((!start || now >= start) && (!end || now <= end)) {
      return item.promotional_price;
    }
  }
  return item.additional_price;
};

// Helper to format occupation time
export const formatOccupationTime = (updatedAt: string | null): string => {
  if (!updatedAt) return "";
  const start = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
};

export function usePDVData(storeId: string | undefined) {
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<OptionItem[]>([]);
  const [allGroups, setAllGroups] = useState<OptionGroup[]>([]);
  const [allOptionItems, setAllOptionItems] = useState<OptionItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inventory products state
  const [inventoryCategories, setInventoryCategories] = useState<{ id: string; name: string; icon: string | null }[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<OptionItem[]>([]);
  
  // Regular products state (from products table)
  const [regularProducts, setRegularProducts] = useState<OptionItem[]>([]);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    
    try {
      // Load tables, categories, payment methods, groups, inventory, and regular products
      const [tablesRes, categoriesRes, paymentsRes, groupsRes, invCategoriesRes, invProductsRes, productsRes] = await Promise.all([
        supabase.from("tables").select("id, number, name, status, updated_at").eq("store_id", storeId).eq("is_active", true).order("display_order"),
        supabase.from("categories").select("id, name, slug, icon").eq("store_id", storeId).eq("is_active", true).order("display_order"),
        supabase.from("payment_methods").select("id, name, icon_type").eq("store_id", storeId).eq("is_active", true).order("display_order"),
        supabase.from("category_option_groups").select("*").eq("store_id", storeId).eq("is_active", true).order("display_order"),
        supabase.from("inventory_categories").select("id, name, icon").eq("store_id", storeId).eq("is_active", true).order("display_order"),
        supabase.from("inventory_products").select("id, name, description, price, promotional_price, image_url, category_id, stock_quantity").eq("store_id", storeId).eq("is_active", true).gt("stock_quantity", 0).order("display_order"),
        supabase.from("products").select("id, name, description, price, promotional_price, image_url, category_id, is_available, variations").eq("store_id", storeId).eq("is_available", true).order("display_order"),
      ]);
      
      setTables(tablesRes.data || []);
      setCategories(categoriesRes.data || []);
      setPaymentMethods(paymentsRes.data || []);
      setAllGroups((groupsRes.data as OptionGroup[]) || []);
      setInventoryCategories(invCategoriesRes.data || []);
      
      const cats = categoriesRes.data || [];
      
      // Map inventory products to OptionItem format
      const invProducts: OptionItem[] = (invProductsRes.data || []).map(p => ({
        id: `inv-${p.id}`,
        group_id: `inv-cat-${p.category_id}`,
        name: p.name,
        description: p.description,
        image_url: p.image_url,
        additional_price: p.price,
        promotional_price: p.promotional_price,
        promotion_start_at: null,
        promotion_end_at: null,
        is_active: true,
        category_id: `inv-${p.category_id}`,
        category_name: invCategoriesRes.data?.find(c => c.id === p.category_id)?.name,
      }));
      setInventoryProducts(invProducts);
      
      // Map regular products to OptionItem format
      const regProducts: OptionItem[] = (productsRes.data || []).map(p => {
        // Parse variations from JSON
        let variations: ProductVariation[] | undefined;
        if (p.variations && Array.isArray(p.variations)) {
          variations = (p.variations as any[]).map(v => ({
            name: v.name || '',
            price: typeof v.price === 'number' ? v.price : 0,
          }));
        }
        
        return {
          id: `prod-${p.id}`,
          group_id: `prod-cat-${p.category_id}`,
          name: p.name,
          description: p.description,
          image_url: p.image_url,
          additional_price: p.price,
          promotional_price: p.promotional_price,
          promotion_start_at: null,
          promotion_end_at: null,
          is_active: true,
          category_id: p.category_id,
          category_name: cats.find(c => c.id === p.category_id)?.name,
          variations: variations && variations.length > 0 ? variations : undefined,
        };
      });
      setRegularProducts(regProducts);
      
      const groups = groupsRes.data || [];
      
      if (groups.length > 0) {
        const groupIds = groups.map(g => g.id);
        const { data: optionItems } = await supabase
          .from("category_option_items")
          .select("*")
          .in("group_id", groupIds)
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("display_order");
        
        setAllOptionItems(optionItems || []);
        
        // Filter primary items for main product display
        const primaryGroups = groups.filter(g => g.is_primary);
        const primaryGroupIds = primaryGroups.map(g => g.id);
        
        const primaryItems = (optionItems || [])
          .filter(item => primaryGroupIds.includes(item.group_id))
          .map(item => {
            const group = groups.find(g => g.id === item.group_id);
            const cat = cats.find(c => c.id === group?.category_id);
            return {
              ...item,
              category_id: group?.category_id,
              category_name: cat?.name,
            };
          });
        
        setItems(primaryItems);
      } else {
        setItems([]);
        setAllOptionItems([]);
      }
    } catch {
      // Error handled silently, toast shown by caller
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine option items, inventory products, and regular products
  const allDisplayItems = useMemo(() => [...items, ...inventoryProducts, ...regularProducts], [items, inventoryProducts, regularProducts]);
  
  // Combine categories with inventory categories
  const allDisplayCategories = useMemo(() => {
    const invCats = inventoryCategories.map(c => ({
      id: `inv-${c.id}`,
      name: c.name,
      slug: `estoque-${c.id}`,
      icon: c.icon,
    }));
    return [...categories, ...invCats];
  }, [categories, inventoryCategories]);

  // Get secondary groups for a category
  const getSecondaryGroups = useCallback((categoryId: string) => {
    return allGroups.filter(g => g.category_id === categoryId && !g.is_primary);
  }, [allGroups]);

  // Get items for a group
  const getGroupItems = useCallback((groupId: string) => {
    return allOptionItems.filter(item => item.group_id === groupId);
  }, [allOptionItems]);

  return {
    tables,
    setTables,
    categories,
    paymentMethods,
    allGroups,
    allOptionItems,
    loading,
    allDisplayItems,
    allDisplayCategories,
    getSecondaryGroups,
    getGroupItems,
    loadData,
  };
}
