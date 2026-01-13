// Storefront Page - Dynamic Categories and Products
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useStoreStatus } from "@/contexts/StoreStatusContext";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import ProductSearch from "@/components/storefront/ProductSearch";
import ProductFilters, { PriceFilter, SortOption } from "@/components/storefront/ProductFilters";
import CategoryTabs from "@/components/storefront/CategoryTabs";
import ProductGrid from "@/components/storefront/ProductGrid";
import FeaturedProducts from "@/components/storefront/FeaturedProducts";
import CartFloatingButton from "@/components/storefront/CartFloatingButton";
import StorefrontSkeleton from "@/components/storefront/StorefrontSkeleton";
import ProductCustomizationModal from "@/components/storefront/ProductCustomizationModal";
import AboutSection from "@/components/storefront/AboutSection";
import ClosedOverlay from "@/components/storefront/ClosedOverlay";
import BottomNavigation, { NavigationTab } from "@/components/storefront/BottomNavigation";
import OrderHistoryContent from "@/components/storefront/OrderHistoryContent";
import CardapioSkeleton from "@/components/storefront/skeletons/CardapioSkeleton";
import PedidosSkeleton from "@/components/storefront/skeletons/PedidosSkeleton";
import SobreSkeleton from "@/components/storefront/skeletons/SobreSkeleton";
import InstallPrompt from "@/components/storefront/InstallPrompt";
import UpsellModal from "@/components/storefront/UpsellModal";
import { LoyaltyWidget } from "@/components/storefront/LoyaltyWidget";
import { PizzaSizeGrid } from "@/components/storefront/PizzaSizeGrid";
import { PizzaFlavorSelectionDrawer } from "@/components/storefront/PizzaFlavorSelectionDrawer";
import { PizzaDoughSelectionDrawer } from "@/components/storefront/PizzaDoughSelectionDrawer";
import { parseSchedule, isStoreOpenNow, getNextOpeningTime } from "@/lib/scheduleUtils";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

// Helper to convert HEX color to HSL values
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Generate CSS variables and font from store's colors and font
function getStoreThemeStyles(
  primaryColor: string | null, 
  secondaryColor: string | null,
  fontFamily: string | null
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  // Apply font family
  if (fontFamily) {
    styles.fontFamily = `'${fontFamily}', system-ui, sans-serif`;
  }
  
  // Apply primary color
  if (primaryColor) {
    const primaryHsl = hexToHsl(primaryColor);
    if (primaryHsl) {
      const { h, s, l } = primaryHsl;
      const foregroundL = l > 50 ? 10 : 98;
      
      Object.assign(styles, {
        '--primary': `${h} ${s}% ${l}%`,
        '--primary-foreground': `0 0% ${foregroundL}%`,
        '--ring': `${h} ${s}% ${l}%`,
      });
    }
  }
  
  // Apply secondary color
  if (secondaryColor) {
    const secondaryHsl = hexToHsl(secondaryColor);
    if (secondaryHsl) {
      const { h, s, l } = secondaryHsl;
      const foregroundL = l > 50 ? 10 : 98;
      
      Object.assign(styles, {
        '--secondary': `${h} ${s}% ${l}%`,
        '--secondary-foreground': `0 0% ${foregroundL}%`,
        '--accent': `${h} ${s}% ${l}%`,
        '--accent-foreground': `0 0% ${foregroundL}%`,
      });
    }
  }
  
  return styles;
}

const STORAGE_KEY = "storefront_active_tab";

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

// Fetch store data with all fields needed for display
// Fetch store data with all fields needed for display
async function fetchStoreData(slug: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url, banner_url, primary_color, secondary_color, font_family, address, phone, whatsapp, instagram, open_hour, close_hour, is_open_override, about_us, estimated_prep_time, estimated_delivery_time, google_maps_link, schedule, min_order_value, use_comanda_mode")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// Check if morph animation is enabled (stored in localStorage per store)
function getMorphAnimationEnabled(storeId: string): boolean {
  try {
    const stored = localStorage.getItem(`morph_animation_${storeId}`);
    return stored !== "false"; // Default to true
  } catch {
    return true;
  }
}

// Fetch categories, products and option groups
async function fetchStoreContent(storeId: string) {
  const [categoriesResult, productsResult, optionGroupsResult, reviewsResult, inventoryCategoriesResult, inventoryProductsResult, flowStepsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon, image_url, use_sequential_flow, has_base_product, category_type, show_flavor_prices")
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
    // Fetch inventory categories
    supabase
      .from("inventory_categories")
      .select("id, name, icon, is_active")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order"),
    // Fetch inventory products with stock > 0
    supabase
      .from("inventory_products")
      .select("id, name, description, price, promotional_price, image_url, category_id, stock_quantity, min_stock_alert")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .order("display_order"),
    // Fetch pizza flow steps configuration
    supabase
      .from("pizza_flow_steps")
      .select("category_id, step_type, is_enabled, step_order, next_step_id")
      .eq("store_id", storeId)
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
    
    // Map items by category_id (via group)
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

  // Build flow steps map by category - stores both enabled status and next_step_id
  // Using plain objects for better React Query serialization
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

  return {
    categories: [...(categoriesResult.data || []) as Category[], ...inventoryCategories],
    products: [...(productsResult.data || []) as Product[], ...inventoryProducts],
    categoryHasOptions,
    primaryGroupItems,
    reviewStats,
    inventoryProductIds: new Set(inventoryProducts.map(p => p.id)),
    flowStepsData,
  };
}

const TAB_ORDER: NavigationTab[] = ["cardapio", "pedidos", "sobre"];

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [enableMorphAnimation, setEnableMorphAnimation] = useState(true);
  
  
  // Initialize active tab from localStorage
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as NavigationTab) || "cardapio";
  });
  
  // Haptic feedback helper - safe for iOS Safari
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore vibration errors on unsupported browsers
    }
  }, []);
  
  // Persist active tab to localStorage with haptic feedback
  const handleTabChange = useCallback((tab: NavigationTab) => {
    triggerHaptic();
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  }, [triggerHaptic]);
  
  // Product customization modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [preselectedOptionId, setPreselectedOptionId] = useState<string | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  
  // Upsell modal state
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellExcludeCategory, setUpsellExcludeCategory] = useState<string | null>(null);
  
  // Pizza flavor selection state
  const [showPizzaFlavorDrawer, setShowPizzaFlavorDrawer] = useState(false);
  const [showPizzaDoughDrawer, setShowPizzaDoughDrawer] = useState(false);
  const [selectedPizzaSize, setSelectedPizzaSize] = useState<{
    id: string;
    name: string;
    maxFlavors: number;
    categoryId: string;
    basePrice: number;
  } | null>(null);
  const [selectedPizzaFlavors, setSelectedPizzaFlavors] = useState<{
    flavors: { id: string; name: string; price: number; surcharge: number; flavor_type: string }[];
    totalPrice: number;
  } | null>(null);
  const [selectedPizzaEdge, setSelectedPizzaEdge] = useState<{
    id: string;
    name: string;
    price: number;
  } | null>(null);
  const [selectedPizzaDough, setSelectedPizzaDough] = useState<{
    id: string;
    name: string;
    price: number;
  } | null>(null);
  
  const { addToCart, totalItems } = useCart();
  const { setStoreData, isOpen: isStoreOpen } = useStoreStatus();

  // Fetch store with aggressive caching (staleTime: 5min, cacheTime: 30min)
  const { data: store, isLoading: storeLoading, refetch: refetchStore } = useQuery({
    queryKey: ["store", slug],
    queryFn: () => fetchStoreData(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Load morph animation preference when store loads
  useEffect(() => {
    if (store?.id) {
      setEnableMorphAnimation(getMorphAnimationEnabled(store.id));
    }
  }, [store?.id]);

  // Fetch content after store loads, with same aggressive caching
  const { data: content, isLoading: contentLoading, refetch: refetchContent } = useQuery({
    queryKey: ["store-content", store?.id],
    queryFn: () => fetchStoreContent(store!.id),
    enabled: !!store?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const queryClient = useQueryClient();

  // Track products with updated prices for visual effect
  const [updatedProductIds, setUpdatedProductIds] = useState<Set<string>>(new Set());

  // Real-time subscription for option items, products and inventory updates (prices and stock)
  useEffect(() => {
    if (!store?.id) return;

    const channel = supabase
      .channel('storefront-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'category_option_items'
        },
        (payload) => {
          // Check if promotional price changed
          const oldPrice = payload.old?.promotional_price;
          const newPrice = payload.new?.promotional_price;
          const oldAdditional = payload.old?.additional_price;
          const newAdditional = payload.new?.additional_price;
          
          if (oldPrice !== newPrice || oldAdditional !== newAdditional) {
            toast.success("🔥 Promoção atualizada!", {
              description: "Os preços do cardápio foram atualizados",
              duration: 4000,
            });
          }
          
          // Invalidate the store-content query to refetch with updated prices
          queryClient.invalidateQueries({ queryKey: ["store-content", store.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          // Check if promotional price or stock changed
          const oldPrice = payload.old?.promotional_price;
          const newPrice = payload.new?.promotional_price;
          const oldRegular = payload.old?.price;
          const newRegular = payload.new?.price;
          const oldStock = payload.old?.stock_quantity;
          const newStock = payload.new?.stock_quantity;
          
          const priceChanged = oldPrice !== newPrice || oldRegular !== newRegular;
          const stockChanged = oldStock !== newStock;
          
          if (priceChanged) {
            const productId = payload.new?.id;
            if (productId) {
              // Add to updated IDs for pulse effect
              setUpdatedProductIds(prev => new Set([...prev, productId]));
              // Clear the pulse effect after animation completes
              setTimeout(() => {
                setUpdatedProductIds(prev => {
                  const next = new Set(prev);
                  next.delete(productId);
                  return next;
                });
              }, 2500);
            }
            
            toast.success("🔥 Promoção atualizada!", {
              description: "Os preços do cardápio foram atualizados",
              duration: 4000,
            });
          }
          
          // Silent refetch for stock changes (no toast to avoid spam)
          if (priceChanged || stockChanged) {
            queryClient.invalidateQueries({ queryKey: ["store-content", store.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_products'
        },
        () => {
          // Refetch inventory products when stock changes
          queryClient.invalidateQueries({ queryKey: ["store-content", store.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pizza_flow_steps'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["store-content", store.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, queryClient]);
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    triggerHaptic();
    
    try {
      await Promise.all([refetchStore(), refetchContent()]);
      toast.success("Dados atualizados!");
    } catch (error) {
      toast.error("Erro ao atualizar");
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchStore, refetchContent, triggerHaptic]);

  const categories = content?.categories || [];
  const products = content?.products || [];
  const categoryHasOptions = content?.categoryHasOptions || new Map<string, boolean>();
  const primaryGroupItems = content?.primaryGroupItems || {};
  const reviewStats = content?.reviewStats;
  const flowStepsData = content?.flowStepsData || {};
  const loading = storeLoading || (!!store && contentLoading);

  // Use ref to always have latest flowStepsData (avoids stale closure issues)
  const flowStepsDataRef = useRef(flowStepsData);
  useEffect(() => {
    flowStepsDataRef.current = flowStepsData;
  }, [flowStepsData]);

  // Helper to check if a flow step is enabled for a category
  const isStepEnabled = useCallback((categoryId: string, stepType: string): boolean => {
    const data = flowStepsDataRef.current;
    const categorySteps = data[categoryId];
    if (!categorySteps) return true; // Default to enabled if not configured
    const stepData = categorySteps[stepType];
    if (!stepData) return true; // Default to enabled if step not found
    return stepData.is_enabled;
  }, []);

  // Helper to get the next step after a given step for a category
  const getNextStep = useCallback((categoryId: string, currentStepType: string): string | null => {
    const data = flowStepsDataRef.current;
    const categorySteps = data[categoryId];
    if (!categorySteps) return null;
    const stepData = categorySteps[currentStepType];
    if (!stepData) return null;
    return stepData.next_step_id;
  }, []);

  // Helper to navigate to the next enabled step
  const navigateToNextStep = useCallback((categoryId: string, currentStepType: string): string | null => {
    let nextStep = getNextStep(categoryId, currentStepType);
    
    // Follow the chain until we find an enabled step or reach cart/null
    while (nextStep && nextStep !== 'cart') {
      if (isStepEnabled(categoryId, nextStep)) {
        return nextStep;
      }
      // This step is disabled, get its next step
      nextStep = getNextStep(categoryId, nextStep);
    }
    
    return nextStep;
  }, [getNextStep, isStepEnabled]);

  // Helper to check if promotion is currently active
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

  // Create virtual products from primary group items for categories that have option groups
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
        
        // Create a virtual product for each primary group item
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
  
  // Combine real products with virtual category products
  const allProducts = useMemo(() => {
    const realProducts = products.map(p => ({ ...p, isVirtualProduct: false }));
    return [...realProducts, ...categoryProducts];
  }, [products, categoryProducts]);

  // Set initial category when categories load
  const initialCategory = useMemo(() => {
    if (categories.length > 0) {
      return categories[0].id;
    }
    return null;
  }, [categories]);

  // Only set active category once when initial category is available
  const effectiveCategory = activeCategory ?? initialCategory;

  // Check if current category is a pizza category
  const activeCategoryData = useMemo(() => {
    return categories.find(c => c.id === effectiveCategory);
  }, [categories, effectiveCategory]);

  const isPizzaCategory = activeCategoryData?.category_type === "pizza";

  // Define handleSearch before early returns to avoid hook issues
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Clear category filter when searching
    if (query) {
      setActiveCategory(null);
    }
  }, []);

  const handleProductClick = useCallback((product: Product & { isVirtualProduct?: boolean; primaryOptionId?: string }) => {
    // Block if store is closed
    if (!isStoreOpen) {
      toast.error("Estabelecimento fechado", {
        description: "Não é possível adicionar itens ao carrinho no momento.",
      });
      return;
    }

    // Check if this is an inventory product (id starts with 'inv-')
    const isInventoryProduct = product.id.startsWith('inv-');
    
    if (isInventoryProduct) {
      // Add inventory product directly to cart
      const category = categories.find(c => c.id === product.category_id);
      addToCart({
        id: product.id,
        name: product.name,
        price: product.promotional_price || product.price,
        quantity: 1,
        category: category?.name || "Estoque",
        description: product.description || undefined,
        image_url: product.image_url || undefined,
      });
      return;
    }

    const category = categories.find(c => c.id === product.category_id);
    
    if (category) {
      // For virtual products (from primary options), create a simple product object
      const productForModal: Product = product.isVirtualProduct 
        ? {
            id: category.id,
            name: product.name, // Use the option name
            description: null,
            price: product.price, // Use the option price
            promotional_price: product.promotional_price, // Keep promotional price for consistency
            image_url: product.image_url || category.image_url,
            category_id: category.id,
            is_featured: false,
          }
        : product;
      
      setSelectedProduct(productForModal);
      setSelectedCategory(category);
      // Pass the primary option ID to preselect in modal
      setPreselectedOptionId(product.isVirtualProduct ? product.primaryOptionId || null : null);
      setShowCustomizationModal(true);
    } else {
      // No category found, add directly to cart
      addToCart({
        id: product.id,
        name: product.name,
        price: product.promotional_price || product.price,
        quantity: 1,
        category: "Produto",
        description: product.description || undefined,
        image_url: product.image_url || undefined,
      });
    }
  }, [categories, addToCart, isStoreOpen]);

  const handleCustomizationComplete = useCallback(() => {
    setShowCustomizationModal(false);
    setSelectedProduct(null);
    setSelectedCategory(null);
    setPreselectedOptionId(null);
  }, []);

  const handleShowUpsell = useCallback((categoryId: string) => {
    setShowCustomizationModal(false);
    setSelectedProduct(null);
    setSelectedCategory(null);
    setUpsellExcludeCategory(categoryId);
    setShowUpsellModal(true);
  }, []);

  const handleUpsellContinueShopping = useCallback((categoryId: string) => {
    setShowUpsellModal(false);
    setActiveCategory(categoryId);
    setActiveTab("cardapio");
  }, []);

  // Pizza size selection handler
  const handlePizzaSizeSelect = useCallback((sizeId: string, sizeName: string, maxFlavors: number, basePrice: number) => {
    if (!isStoreOpen) {
      toast.error("Estabelecimento fechado", {
        description: "Não é possível fazer pedidos no momento.",
      });
      return;
    }
    
    if (activeCategoryData) {
      setSelectedPizzaSize({
        id: sizeId,
        name: sizeName,
        maxFlavors,
        categoryId: activeCategoryData.id,
        basePrice,
      });
      setShowPizzaFlavorDrawer(true);
    }
  }, [isStoreOpen, activeCategoryData]);

  // Direct finalize without going through state (used when skipping steps)
  const finalizePizzaOrderDirect = useCallback((
    flavorsData: { flavors: { id: string; name: string; price: number; surcharge: number; flavor_type: string }[]; totalPrice: number },
    edgeData: { id: string; name: string; price: number } | null,
    doughData: { id: string; name: string; price: number } | null
  ) => {
    if (!selectedPizzaSize || !activeCategoryData) return;

    const flavorNames = flavorsData.flavors.map(f => f.name).join(" + ");
    const edgePrice = edgeData?.price || 0;
    const doughPrice = doughData?.price || 0;
    const finalPrice = flavorsData.totalPrice + edgePrice + doughPrice;
    
    const descriptionParts = [flavorNames];
    if (edgeData) {
      descriptionParts.push(`Borda: ${edgeData.name}`);
    }
    if (doughData) {
      descriptionParts.push(`Massa: ${doughData.name}`);
    }
    
    addToCart({
      id: `pizza-${selectedPizzaSize.id}-${Date.now()}`,
      name: `${activeCategoryData.name} ${selectedPizzaSize.name}`,
      price: finalPrice,
      quantity: 1,
      category: activeCategoryData.name,
      description: descriptionParts.join(" • "),
    });

    // Reset all pizza selection state
    setSelectedPizzaSize(null);
    setSelectedPizzaFlavors(null);
    setSelectedPizzaEdge(null);
    setSelectedPizzaDough(null);
    
    toast.success("Pizza adicionada ao carrinho!");
  }, [selectedPizzaSize, activeCategoryData, addToCart]);

  // Helper to open the appropriate step drawer
  const openStepDrawer = useCallback((stepType: string | null, flavorsData?: { flavors: any[]; totalPrice: number }, edgeData?: { id: string; name: string; price: number } | null, doughData?: { id: string; name: string; price: number } | null) => {
    switch (stepType) {
      case 'dough':
        setShowPizzaDoughDrawer(true);
        break;
      case 'cart':
      case null:
        // Finalize order
        if (flavorsData) {
          finalizePizzaOrderDirect(flavorsData, edgeData || null, doughData || null);
        }
        break;
    }
  }, [finalizePizzaOrderDirect]);

  // Pizza flavor selection complete handler - now receives everything from integrated drawer
  const handlePizzaFlavorComplete = useCallback((
    flavors: { id: string; name: string; price: number; surcharge: number; flavor_type: string }[], 
    totalPrice: number,
    edge?: { id: string; name: string; price: number } | null,
    drink?: { id: string; name: string; price: number; promotional_price: number | null; image_url: string | null } | null
  ) => {
    if (!selectedPizzaSize || !activeCategoryData) return;

    setShowPizzaFlavorDrawer(false);

    const flavorNames = flavors.map(f => f.name).join(" + ");
    const edgePrice = edge?.price || 0;
    const finalPrice = totalPrice + edgePrice;
    
    const descriptionParts = [flavorNames];
    if (edge) {
      descriptionParts.push(`Borda: ${edge.name}`);
    }
    
    // Add pizza to cart
    addToCart({
      id: `pizza-${selectedPizzaSize.id}-${Date.now()}`,
      name: `${activeCategoryData.name} ${selectedPizzaSize.name}`,
      price: finalPrice,
      quantity: 1,
      category: activeCategoryData.name,
      description: descriptionParts.join(" • "),
    });

    // Add drink if selected
    if (drink) {
      addToCart({
        id: drink.id,
        name: drink.name,
        price: drink.promotional_price ?? drink.price,
        quantity: 1,
        category: "Bebidas",
      });
    }

    // Reset all pizza selection state
    setSelectedPizzaSize(null);
    setSelectedPizzaFlavors(null);
    setSelectedPizzaEdge(null);
    setSelectedPizzaDough(null);
    
    toast.success(drink ? "Pizza e bebida adicionadas!" : "Pizza adicionada ao carrinho!");
  }, [selectedPizzaSize, activeCategoryData, addToCart]);

  // Pizza dough selection complete handler - checks which step to open next
  const handlePizzaDoughComplete = useCallback((dough: { id: string; name: string; description: string | null; price: number } | null) => {
    if (!selectedPizzaSize || !activeCategoryData || !selectedPizzaFlavors) return;

    const doughData = dough ? { id: dough.id, name: dough.name, price: dough.price } : null;
    setSelectedPizzaDough(doughData);
    setShowPizzaDoughDrawer(false);
    
    // Get the next enabled step
    setTimeout(() => {
      const nextStep = navigateToNextStep(activeCategoryData.id, 'dough');
      openStepDrawer(nextStep, selectedPizzaFlavors, selectedPizzaEdge, doughData);
    }, 150);
  }, [selectedPizzaSize, activeCategoryData, selectedPizzaFlavors, selectedPizzaEdge, navigateToNextStep, openStepDrawer]);

  // Parse and check if store is open - MUST be before early returns
  const parsedSchedule = useMemo(() => {
    if (!store?.schedule) return null;
    return parseSchedule(store.schedule);
  }, [store?.schedule]);

  const storeStatus = useMemo(() => {
    if (!parsedSchedule) return { isOpen: false, statusText: "Fechado" };
    return isStoreOpenNow(
      parsedSchedule,
      store?.is_open_override,
      store?.open_hour ?? undefined,
      store?.close_hour ?? undefined
    );
  }, [parsedSchedule, store?.is_open_override, store?.open_hour, store?.close_hour]);

  const nextOpeningTime = useMemo(() => {
    if (storeStatus.isOpen || !parsedSchedule) return null;
    return getNextOpeningTime(parsedSchedule);
  }, [storeStatus.isOpen, parsedSchedule]);

  // Count products with promotions - must be before early returns
  const promoCount = useMemo(() => {
    return allProducts.filter(p => 
      !p.isVirtualProduct && 
      p.promotional_price !== null && 
      p.promotional_price < p.price
    ).length;
  }, [allProducts]);

  // Generate dynamic theme styles from store's colors and font - must be before early returns
  const storeThemeStyles = useMemo(() => getStoreThemeStyles(
    store?.primary_color, 
    (store as any)?.secondary_color, 
    (store as any)?.font_family
  ), [store?.primary_color, (store as any)?.secondary_color, (store as any)?.font_family]);

  useEffect(() => {
    if (store) {
      setStoreData({
        schedule: store.schedule,
        is_open_override: store.is_open_override,
        open_hour: store.open_hour,
        close_hour: store.close_hour,
      });
    }
  }, [store?.schedule, store?.is_open_override, store?.open_hour, store?.close_hour, setStoreData, store]);

  // Fetch pending orders count for badge
  useEffect(() => {
    if (!store?.id) return;
    
    const fetchPendingOrders = async () => {
      // Get phone from localStorage (saved during order)
      const savedPhone = localStorage.getItem("customer_phone");
      if (!savedPhone) return;
      
      const cleanPhone = savedPhone.replace(/\D/g, "");
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id)
        .or(`customer_phone.eq.${cleanPhone},customer_phone.ilike.%${cleanPhone}%`)
        .in("status", ["pending", "confirmed", "preparing", "ready", "delivering"]);
      
      setPendingOrdersCount(count || 0);
    };

    fetchPendingOrders();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("customer-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${store.id}` },
        () => fetchPendingOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id]);

  if (loading) {
    return <StorefrontSkeleton />;
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }


  const filteredProducts = allProducts
    .filter(p => {
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !effectiveCategory || p.category_id === effectiveCategory;
      
      // Promo filter
      if (showPromoOnly && !p.isVirtualProduct) {
        const hasPromo = p.promotional_price !== null && p.promotional_price < p.price;
        if (!hasPromo) return false;
      }
      
      // Skip price filter for virtual products (categories with options)
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
      // Virtual products always come first
      if (a.isVirtualProduct && !b.isVirtualProduct) return -1;
      if (!a.isVirtualProduct && b.isVirtualProduct) return 1;
      
      const priceA = a.promotional_price ?? a.price;
      const priceB = b.promotional_price ?? b.price;
      
      switch (sortOption) {
        case "price_asc":
          return priceA - priceB;
        case "price_desc":
          return priceB - priceA;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  const featuredProducts = allProducts.filter(p => p.is_featured && !p.isVirtualProduct);

  return (
    <div 
      className="min-h-dvh bg-white flex flex-col light" 
      data-theme="light"
      style={storeThemeStyles}
    >
      {/* Closed Overlay */}
      {!storeStatus.isOpen && activeTab === "cardapio" && <ClosedOverlay nextOpeningTime={nextOpeningTime} />}
      
      {/* Main scrollable content */}
      <div className="flex-1 max-w-4xl mx-auto w-full overflow-y-auto pb-24 min-h-0 ios-scroll">
        <StorefrontHeader 
          store={store} 
          reviewStats={reviewStats}
          onRatingClick={() => handleTabChange("sobre")}
        />
        
        {/* Tab Content with Animations */}
        <div className="min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {isRefreshing ? (
              <motion.div
                key="refreshing-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {activeTab === "cardapio" && <CardapioSkeleton />}
                {activeTab === "pedidos" && <PedidosSkeleton />}
                {activeTab === "sobre" && <SobreSkeleton />}
              </motion.div>
            ) : (
              <>
                {activeTab === "cardapio" && (
                  <motion.div
                    key="cardapio"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <BannerCarousel storeId={store.id} />
                    
                    {/* Featured Products Section */}
                    {!searchQuery && featuredProducts.length > 0 && (
                      <FeaturedProducts 
                        products={featuredProducts} 
                        onProductClick={handleProductClick} 
                      />
                    )}
                    
                    <ProductSearch onSearch={handleSearch} />
                    
                    {promoCount > 0 && (
                      <ProductFilters
                        priceFilter={priceFilter}
                        onPriceChange={setPriceFilter}
                        sortOption={sortOption}
                        onSortChange={setSortOption}
                        showPromoOnly={showPromoOnly}
                        onPromoChange={setShowPromoOnly}
                        promoCount={promoCount}
                      />
                    )}
                    
                    {!searchQuery && (
                      <CategoryTabs
                        categories={categories}
                        activeCategory={effectiveCategory}
                        onCategoryChange={setActiveCategory}
                        enableMorphAnimation={enableMorphAnimation}
                      />
                    )}

                    {searchQuery && filteredProducts.length === 0 ? (
                      <div className="px-4 py-12 text-center">
                        <p className="text-muted-foreground">Nenhum produto encontrado para "{searchQuery}"</p>
                      </div>
                    ) : isPizzaCategory && !searchQuery && effectiveCategory && store ? (
                      <PizzaSizeGrid
                        categoryId={effectiveCategory}
                        storeId={store.id}
                        onSizeSelect={handlePizzaSizeSelect}
                      />
                    ) : (
                      <ProductGrid
                        products={filteredProducts}
                        onProductClick={handleProductClick}
                        updatedProductIds={updatedProductIds}
                      />
                    )}
                  </motion.div>
                )}

                {activeTab === "pedidos" && (
                  <motion.div
                    key="pedidos"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="min-h-[60vh]"
                  >
                    <OrderHistoryContent storeId={store.id} storeName={store.name} />
                  </motion.div>
                )}


                {activeTab === "sobre" && (
                  <motion.div
                    key="sobre"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="min-h-[60vh]"
                  >
                    <div className="px-4 py-6">
                      <AboutSection store={store} expanded />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        pendingOrdersCount={pendingOrdersCount}
        cartItemsCount={totalItems}
        storeSlug={slug}
        hideOrdersTab={(store as any)?.use_comanda_mode === false}
      />

      {showCustomizationModal && selectedProduct && selectedCategory && store && (
        <ProductCustomizationModal
          product={selectedProduct}
          category={selectedCategory}
          storeId={store.id}
          preselectedOptionId={preselectedOptionId}
          onClose={() => setShowCustomizationModal(false)}
          onComplete={handleCustomizationComplete}
          onShowUpsell={handleShowUpsell}
        />
      )}

      {showUpsellModal && store && (
        <UpsellModal
          storeId={store.id}
          excludeCategoryId={upsellExcludeCategory || undefined}
          onClose={() => setShowUpsellModal(false)}
          onContinueShopping={handleUpsellContinueShopping}
        />
      )}

      {/* Pizza Flavor Selection Drawer */}
      {selectedPizzaSize && store && (
        <PizzaFlavorSelectionDrawer
          open={showPizzaFlavorDrawer}
          onClose={() => {
            setShowPizzaFlavorDrawer(false);
            setSelectedPizzaSize(null);
          }}
          categoryId={selectedPizzaSize.categoryId}
          sizeId={selectedPizzaSize.id}
          sizeName={selectedPizzaSize.name}
          maxFlavors={selectedPizzaSize.maxFlavors}
          storeId={store.id}
          basePrice={selectedPizzaSize.basePrice}
          flowSteps={content?.flowStepsData?.[selectedPizzaSize.categoryId]}
          onComplete={handlePizzaFlavorComplete}
        />
      )}

      {/* Pizza Dough Selection Drawer */}
      {selectedPizzaSize && store && (
        <PizzaDoughSelectionDrawer
          open={showPizzaDoughDrawer}
          onClose={() => {
            setShowPizzaDoughDrawer(false);
            setSelectedPizzaSize(null);
            setSelectedPizzaFlavors(null);
            setSelectedPizzaEdge(null);
          }}
          categoryId={selectedPizzaSize.categoryId}
          sizeId={selectedPizzaSize.id}
          sizeName={selectedPizzaSize.name}
          onComplete={handlePizzaDoughComplete}
        />
      )}

      {/* Loyalty Widget */}
      {store && <LoyaltyWidget storeId={store.id} storeName={store.name} />}

      {/* InstallPrompt removed */}
    </div>
  );
}
