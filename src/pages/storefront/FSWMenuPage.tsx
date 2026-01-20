import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useStoreStatus } from "@/contexts/StoreStatusContext";
import { toast } from "sonner";
import { motion } from "framer-motion";

import {
  FSWRestaurantHeader,
  FSWCategoryTabs,
  FSWProductList,
  FSWProductSheet,
  FSWCartBar,
  FSWCartSheet,
} from "@/components/storefront/fsw";
import { Skeleton } from "@/components/ui/skeleton";

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  about_us: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_id: string;
}

// Fetch store by slug
async function fetchStore(slug: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url, banner_url, about_us")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Fetch categories and products for the store
async function fetchStoreContent(storeId: string) {
  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("products")
      .select("id, name, description, price, promotional_price, image_url, category_id")
      .eq("store_id", storeId)
      .eq("is_available", true)
      .order("display_order"),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;

  return {
    categories: (categoriesResult.data || []) as Category[],
    products: (productsResult.data || []) as Product[],
  };
}

export default function FSWMenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isOpen: isStoreOpen } = useStoreStatus();

  // State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);

  // Fetch store
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["fsw-store", slug],
    queryFn: () => fetchStore(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch content after store
  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ["fsw-store-content", store?.id],
    queryFn: () => fetchStoreContent(store!.id),
    enabled: !!store?.id,
    staleTime: 2 * 60 * 1000,
  });

  const categories = content?.categories || [];
  const products = content?.products || [];

  // Set initial category
  const effectiveCategory = activeCategory ?? (categories.length > 0 ? categories[0].id : null);

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    if (!effectiveCategory) return products;
    return products.filter((p) => p.category_id === effectiveCategory);
  }, [products, effectiveCategory]);

  // Get active category name
  const activeCategoryName = useMemo(() => {
    const cat = categories.find((c) => c.id === effectiveCategory);
    return cat?.name || "Produto";
  }, [categories, effectiveCategory]);

  // Handle product click
  const handleProductClick = useCallback(
    (product: Product) => {
      if (!isStoreOpen) {
        toast.error("Estabelecimento fechado", {
          description: "Não é possível adicionar itens ao carrinho no momento.",
        });
        return;
      }
      setSelectedProduct(product);
      setShowProductSheet(true);
    },
    [isStoreOpen]
  );

  // Loading state
  const loading = storeLoading || (!!store && contentLoading);

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-storefront">
        {/* Header skeleton */}
        <Skeleton className="h-[250px] w-full" />
        
        {/* Category tabs skeleton */}
        <div className="flex gap-2 p-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>

        {/* Products skeleton */}
        <div className="flex flex-col gap-3 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 p-3">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-white font-storefront flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Loja não encontrada</h1>
          <p className="text-gray-500">Verifique o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-storefront">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Restaurant Header */}
        <FSWRestaurantHeader store={store} />

        {/* Category Tabs */}
        {categories.length > 0 && (
          <FSWCategoryTabs
            categories={categories}
            activeCategory={effectiveCategory || ""}
            onCategoryChange={setActiveCategory}
          />
        )}

        {/* Product List */}
        <FSWProductList
          products={filteredProducts}
          onProductClick={handleProductClick}
        />

        {/* Cart Bar (Fixed at bottom) */}
        <FSWCartBar onOpenCart={() => setShowCartSheet(true)} />

        {/* Product Sheet (Modal) */}
        <FSWProductSheet
          product={selectedProduct}
          open={showProductSheet}
          onOpenChange={setShowProductSheet}
          categoryName={activeCategoryName}
        />

        {/* Cart Sheet (Modal) */}
        <FSWCartSheet
          open={showCartSheet}
          onOpenChange={setShowCartSheet}
        />
      </motion.div>
    </div>
  );
}
