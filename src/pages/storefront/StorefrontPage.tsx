// Storefront Page - Refactored with custom hooks
import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useStoreStatus } from "@/contexts/StoreStatusContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useStorefrontData, type Category, type Product } from "@/hooks/useStorefrontData";
import { useStorefrontPizzaFlow } from "@/hooks/useStorefrontPizzaFlow";
import { useStorefrontUI, createVirtualProducts, filterAndSortProducts } from "@/hooks/useStorefrontUI";
import { getStoreThemeStyles, getMorphAnimationEnabled } from "@/lib/storeTheme";
import { usePrefetchUpsellModals } from "@/components/storefront/DynamicUpsellModal";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

// Components
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import ProductFilters from "@/components/storefront/ProductFilters";
import CategoryTabs from "@/components/storefront/CategoryTabs";
import ProductGrid from "@/components/storefront/ProductGrid";
import FeaturedProducts from "@/components/storefront/FeaturedProducts";
import StorefrontSkeleton from "@/components/storefront/StorefrontSkeleton";
import ProductCustomizationModal from "@/components/storefront/ProductCustomizationModal";
import AboutSection from "@/components/storefront/AboutSection";
import ClosedOverlay from "@/components/storefront/ClosedOverlay";
import BottomNavigation from "@/components/storefront/BottomNavigation";
import OrderHistoryContent from "@/components/storefront/OrderHistoryContent";
import CardapioSkeleton from "@/components/storefront/skeletons/CardapioSkeleton";
import PedidosSkeleton from "@/components/storefront/skeletons/PedidosSkeleton";
import SobreSkeleton from "@/components/storefront/skeletons/SobreSkeleton";
import DynamicUpsellModal from "@/components/storefront/DynamicUpsellModal";
import { LoyaltyWidget } from "@/components/storefront/LoyaltyWidget";
import { PizzaSizeGrid } from "@/components/storefront/PizzaSizeGrid";
import { PizzaFlavorSelectionDrawer } from "@/components/storefront/PizzaFlavorSelectionDrawer";
import { PizzaDoughSelectionDrawer } from "@/components/storefront/PizzaDoughSelectionDrawer";
import { StandardCategoryGrid } from "@/components/storefront/StandardCategoryGrid";
import { BeverageTypesGrid } from "@/components/storefront/BeverageTypesGrid";
import ProductDetailDrawer from "@/components/storefront/ProductDetailDrawer";

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, totalItems } = useCart();
  const { setStoreData, isOpen: isStoreOpen } = useStoreStatus();
  
  // Data fetching hook
  const { store, content, loading, updatedProductIds } = useStorefrontData(slug);
  
  // Extract content data
  const categories = content?.categories || [];
  const products = content?.products || [];
  const categoryHasOptions = content?.categoryHasOptions || new Map<string, boolean>();
  const primaryGroupItems = content?.primaryGroupItems || {};
  const reviewStats = content?.reviewStats;
  const flowStepsData = content?.flowStepsData || {};
  
  // UI state hook
  const ui = useStorefrontUI(
    store?.id,
    store?.schedule,
    store?.is_open_override ?? null,
    store?.open_hour ?? null,
    store?.close_hour ?? null
  );
  
  // Favorites hook
  const { favoritesCount } = useFavorites(store?.id);
  
  // Morph animation state
  const [enableMorphAnimation, setEnableMorphAnimation] = useState(true);
  
  useEffect(() => {
    if (store?.id) {
      setEnableMorphAnimation(getMorphAnimationEnabled(store.id));
    }
  }, [store?.id]);
  
  // Product customization modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [preselectedOptionId, setPreselectedOptionId] = useState<string | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  
  // Simple product detail drawer state
  const [showProductDetailDrawer, setShowProductDetailDrawer] = useState(false);
  const [simpleProduct, setSimpleProduct] = useState<Product | null>(null);
  const [simpleProductCategoryName, setSimpleProductCategoryName] = useState("");
  
  // Compute active category
  const initialCategory = useMemo(() => categories.length > 0 ? categories[0].id : null, [categories]);
  const effectiveCategory = ui.activeCategory ?? initialCategory;
  
  // Get active category data
  const activeCategoryData = useMemo(() => {
    return categories.find(c => c.id === effectiveCategory);
  }, [categories, effectiveCategory]);
  
  const isPizzaCategory = activeCategoryData?.category_type === "pizza";
  const isStandardCategory = activeCategoryData?.category_type === "standard";
  const isBeveragesCategory = activeCategoryData?.category_type === "beverages";
  
  // Pizza flow hook
  const pizzaFlow = useStorefrontPizzaFlow(flowStepsData, activeCategoryData, isStoreOpen);
  
  // Prefetch upsell modals
  const prefetchUpsellModals = usePrefetchUpsellModals(store?.id, activeCategoryData?.id);
  
  // Create virtual products from primary group items
  const categoryProducts = useMemo(() => {
    return createVirtualProducts(categories, categoryHasOptions, primaryGroupItems);
  }, [categories, categoryHasOptions, primaryGroupItems]);
  
  // Combine real products with virtual products
  const allProducts = useMemo(() => {
    const realProducts = products.map(p => ({ ...p, isVirtualProduct: false }));
    return [...realProducts, ...categoryProducts];
  }, [products, categoryProducts]);
  
  // Count products with promotions
  const promoCount = useMemo(() => {
    return allProducts.filter(p => 
      !p.isVirtualProduct && 
      p.promotional_price !== null && 
      p.promotional_price < p.price
    ).length;
  }, [allProducts]);
  
  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return filterAndSortProducts(allProducts, {
      searchQuery: ui.searchQuery,
      effectiveCategory,
      showPromoOnly: ui.showPromoOnly,
      priceFilter: ui.priceFilter,
      sortOption: ui.sortOption,
    });
  }, [allProducts, ui.searchQuery, effectiveCategory, ui.showPromoOnly, ui.priceFilter, ui.sortOption]);
  
  const featuredProducts = useMemo(() => {
    return allProducts.filter(p => p.is_featured && !p.isVirtualProduct);
  }, [allProducts]);
  
  // Generate theme styles
  const storeThemeStyles = useMemo(() => getStoreThemeStyles(
    store?.primary_color ?? null,
    (store as any)?.secondary_color ?? null,
    (store as any)?.font_family ?? null
  ), [store?.primary_color, (store as any)?.secondary_color, (store as any)?.font_family]);
  
  // Set store data for status context
  useEffect(() => {
    if (store) {
      setStoreData({
        schedule: store.schedule,
        is_open_override: store.is_open_override,
        open_hour: store.open_hour,
        close_hour: store.close_hour,
      });
    }
  }, [store, setStoreData]);
  
  // Product click handler
  const handleProductClick = useCallback((product: Product & { isVirtualProduct?: boolean; primaryOptionId?: string }) => {
    if (!isStoreOpen) {
      toast.error("Estabelecimento fechado", {
        description: "Não é possível adicionar itens ao carrinho no momento.",
      });
      return;
    }

    const isInventoryProduct = product.id.startsWith('inv-');
    const isStandardSizeProduct = product.id.startsWith('standard-size-');
    
    if (isInventoryProduct) {
      const category = categories.find(c => c.id === product.category_id);
      setSimpleProduct(product);
      setSimpleProductCategoryName(category?.name || "Estoque");
      setShowProductDetailDrawer(true);
      return;
    }
    
    if (isStandardSizeProduct) {
      const category = categories.find(c => c.id === product.category_id);
      if (category && categoryHasOptions.has(category.id)) {
        const productForModal: Product = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          promotional_price: product.promotional_price,
          image_url: product.image_url || category.image_url,
          category_id: category.id,
          is_featured: false,
        };
        setSelectedProduct(productForModal);
        setSelectedCategory(category);
        setPreselectedOptionId(null);
        setShowCustomizationModal(true);
      } else {
        setSimpleProduct(product);
        setSimpleProductCategoryName(category?.name || "Produto");
        setShowProductDetailDrawer(true);
      }
      return;
    }

    const category = categories.find(c => c.id === product.category_id);
    
    if (category) {
      const productForModal: Product = product.isVirtualProduct 
        ? {
            id: category.id,
            name: product.name,
            description: null,
            price: product.price,
            promotional_price: product.promotional_price,
            image_url: product.image_url || category.image_url,
            category_id: category.id,
            is_featured: false,
          }
        : product;
      
      if (categoryHasOptions.has(category.id)) {
        setSelectedProduct(productForModal);
        setSelectedCategory(category);
        setPreselectedOptionId(product.isVirtualProduct ? product.primaryOptionId || null : null);
        setShowCustomizationModal(true);
      } else {
        setSimpleProduct(product);
        setSimpleProductCategoryName(category.name);
        setShowProductDetailDrawer(true);
      }
    } else {
      setSimpleProduct(product);
      setSimpleProductCategoryName("Produto");
      setShowProductDetailDrawer(true);
    }
  }, [categories, isStoreOpen, categoryHasOptions]);

  const handleCustomizationComplete = useCallback(() => {
    setShowCustomizationModal(false);
    setSelectedProduct(null);
    setSelectedCategory(null);
    setPreselectedOptionId(null);
  }, []);

  const handleShowUpsell = useCallback((categoryId: string) => {
    pizzaFlow.setUpsellTriggerCategoryId(categoryId);
    pizzaFlow.setShowUpsellModal(true);
  }, [pizzaFlow]);

  const handleUpsellClose = useCallback(() => {
    pizzaFlow.handleUpsellClose();
    setShowCustomizationModal(false);
    setShowProductDetailDrawer(false);
    setSelectedProduct(null);
    setSelectedCategory(null);
    setSimpleProduct(null);
  }, [pizzaFlow]);

  // Pizza size selection with prefetch
  const handlePizzaSizeSelect = useCallback((sizeId: string, sizeName: string, maxFlavors: number, basePrice: number, imageUrl: string | null) => {
    prefetchUpsellModals();
    pizzaFlow.handlePizzaSizeSelect(sizeId, sizeName, maxFlavors, basePrice, imageUrl);
  }, [prefetchUpsellModals, pizzaFlow]);

  // Standard category item selection
  const handleStandardItemSelect = useCallback((item: any, size: any, price: number, _quantity: number) => {
    const category = categories.find(c => c.id === effectiveCategory);
    if (category && categoryHasOptions.has(category.id)) {
      const productForModal: Product = {
        id: `${item.id}-${size.id}`,
        name: `${size.name} - ${item.name}`,
        description: item.description,
        price: price,
        promotional_price: null,
        image_url: item.image_url || size.image_url || category.image_url,
        category_id: category.id,
        is_featured: false,
      };
      setSelectedProduct(productForModal);
      setSelectedCategory(category);
      setPreselectedOptionId(null);
      setShowCustomizationModal(true);
    } else {
      if (!isStoreOpen) {
        toast.error("Estabelecimento fechado", {
          description: "Não é possível adicionar itens ao carrinho no momento.",
        });
        return;
      }
      const productForDrawer: Product = {
        id: `${item.id}-${size.id}`,
        name: `${size.name}${item.name !== size.name ? ` - ${item.name}` : ''}`,
        description: item.description,
        price: price,
        promotional_price: null,
        image_url: item.image_url || size.image_url || undefined,
        category_id: effectiveCategory!,
        is_featured: false,
      };
      setSimpleProduct(productForDrawer);
      setSimpleProductCategoryName(category?.name || "Produto");
      setShowProductDetailDrawer(true);
    }
  }, [categories, effectiveCategory, categoryHasOptions, isStoreOpen]);

  // Loading state
  if (loading) {
    return <StorefrontSkeleton />;
  }

  // Not found state
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-dvh bg-background flex flex-col light font-storefront antialiased" 
      data-theme="light"
      style={storeThemeStyles}
    >
      {/* Closed Overlay */}
      {!ui.storeStatus.isOpen && ui.activeTab === "cardapio" && <ClosedOverlay nextOpeningTime={ui.nextOpeningTime} />}
      
      {/* Main scrollable content */}
      <div className="flex-1 max-w-4xl mx-auto w-full overflow-y-auto pb-24 min-h-0 ios-scroll">
        <StorefrontHeader 
          store={store} 
          reviewStats={reviewStats}
          onRatingClick={() => ui.handleTabChange("sobre")}
        />
        
        {/* Tab Content with Animations */}
        <div className="min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {ui.isRefreshing ? (
              <motion.div
                key="refreshing-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {ui.activeTab === "cardapio" && <CardapioSkeleton />}
                {ui.activeTab === "pedidos" && <PedidosSkeleton />}
                {ui.activeTab === "sobre" && <SobreSkeleton />}
              </motion.div>
            ) : (
              <>
                {ui.activeTab === "cardapio" && (
                  <motion.div
                    key="cardapio"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <BannerCarousel storeId={store.id} />
                    
                    {!ui.searchQuery && featuredProducts.length > 0 && (
                      <FeaturedProducts 
                        products={featuredProducts} 
                        onProductClick={handleProductClick} 
                      />
                    )}
                    
                    {(promoCount > 0 || favoritesCount > 0) && (
                      <ProductFilters
                        priceFilter={ui.priceFilter}
                        onPriceChange={ui.setPriceFilter}
                        sortOption={ui.sortOption}
                        onSortChange={ui.setSortOption}
                        showPromoOnly={ui.showPromoOnly}
                        onPromoChange={ui.setShowPromoOnly}
                        promoCount={promoCount}
                        showFavoritesOnly={ui.showFavoritesOnly}
                        onFavoritesChange={ui.setShowFavoritesOnly}
                        favoritesCount={favoritesCount}
                      />
                    )}
                    
                    {!ui.searchQuery && (
                      <CategoryTabs
                        categories={categories}
                        activeCategory={effectiveCategory}
                        onCategoryChange={ui.setActiveCategory}
                        enableMorphAnimation={enableMorphAnimation}
                      />
                    )}

                    {ui.searchQuery && filteredProducts.length === 0 ? (
                      <div className="px-4 py-12 text-center">
                        <p className="text-muted-foreground">Nenhum produto encontrado para "{ui.searchQuery}"</p>
                      </div>
                    ) : isPizzaCategory && !ui.searchQuery && effectiveCategory && store ? (
                      <PizzaSizeGrid
                        categoryId={effectiveCategory}
                        storeId={store.id}
                        onSizeSelect={handlePizzaSizeSelect}
                      />
                    ) : isStandardCategory && !ui.searchQuery && effectiveCategory && store ? (
                      <StandardCategoryGrid
                        categoryId={effectiveCategory}
                        storeId={store.id}
                        displayMode={activeCategoryData?.display_mode}
                        allowQuantitySelector={activeCategoryData?.allow_quantity_selector}
                        onItemSelect={handleStandardItemSelect}
                      />
                    ) : isBeveragesCategory && !ui.searchQuery && effectiveCategory && store ? (
                      <BeverageTypesGrid
                        categoryId={effectiveCategory}
                        storeId={store.id}
                        isStoreOpen={isStoreOpen}
                      />
                    ) : (
                      <ProductGrid
                        products={filteredProducts}
                        onProductClick={handleProductClick}
                        updatedProductIds={updatedProductIds}
                        storeId={store.id}
                        showFavorites={true}
                        filterFavoritesOnly={ui.showFavoritesOnly}
                      />
                    )}
                  </motion.div>
                )}

                {ui.activeTab === "pedidos" && (
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

                {ui.activeTab === "sobre" && (
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
        activeTab={ui.activeTab} 
        onTabChange={ui.handleTabChange} 
        pendingOrdersCount={ui.pendingOrdersCount}
        cartItemsCount={totalItems}
        storeSlug={slug}
        hideOrdersTab={(store as any)?.use_comanda_mode === false}
      />

      {/* Customization Modal */}
      {showCustomizationModal && selectedProduct && selectedCategory && store && (
        <ProductCustomizationModal
          product={selectedProduct}
          category={selectedCategory}
          storeId={store.id}
          preselectedOptionId={preselectedOptionId}
          allowOptionItemQuantity={selectedCategory.allow_quantity_selector !== false}
          onClose={() => setShowCustomizationModal(false)}
          onComplete={handleCustomizationComplete}
          onShowUpsell={handleShowUpsell}
        />
      )}

      {/* Dynamic Upsell Modal */}
      {pizzaFlow.showUpsellModal && pizzaFlow.upsellTriggerCategoryId && store && (
        <DynamicUpsellModal
          storeId={store.id}
          triggerCategoryId={pizzaFlow.upsellTriggerCategoryId}
          onClose={handleUpsellClose}
          onBack={pizzaFlow.handleUpsellBack}
          onNavigateToCategory={(categoryId) => {
            ui.setActiveCategory(categoryId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          sizeId={pizzaFlow.selectedPizzaSize?.id}
          sizeName={pizzaFlow.selectedPizzaSize?.name}
          onSelectEdge={(edge) => {
            if (edge) {
              pizzaFlow.setSelectedPizzaEdge(edge);
              toast.success(`Borda ${edge.name} adicionada!`);
            }
          }}
        />
      )}

      {/* Pizza Flavor Selection Drawer */}
      {pizzaFlow.selectedPizzaSize && store && (
        <PizzaFlavorSelectionDrawer
          open={pizzaFlow.showPizzaFlavorDrawer}
          onClose={() => {
            pizzaFlow.setShowPizzaFlavorDrawer(false);
            pizzaFlow.setSelectedPizzaSize(null);
          }}
          categoryId={pizzaFlow.selectedPizzaSize.categoryId}
          sizeId={pizzaFlow.selectedPizzaSize.id}
          sizeName={pizzaFlow.selectedPizzaSize.name}
          maxFlavors={pizzaFlow.selectedPizzaSize.maxFlavors}
          storeId={store.id}
          basePrice={pizzaFlow.selectedPizzaSize.basePrice}
          sizeImageUrl={pizzaFlow.selectedPizzaSize.imageUrl}
          flowSteps={content?.flowStepsData?.[pizzaFlow.selectedPizzaSize.categoryId]}
          onComplete={pizzaFlow.handlePizzaFlavorComplete}
        />
      )}

      {/* Pizza Dough Selection Drawer */}
      {pizzaFlow.selectedPizzaSize && store && (
        <PizzaDoughSelectionDrawer
          open={pizzaFlow.showPizzaDoughDrawer}
          onClose={() => {
            pizzaFlow.setShowPizzaDoughDrawer(false);
            pizzaFlow.resetPizzaState();
          }}
          categoryId={pizzaFlow.selectedPizzaSize.categoryId}
          sizeId={pizzaFlow.selectedPizzaSize.id}
          sizeName={pizzaFlow.selectedPizzaSize.name}
          onComplete={pizzaFlow.handlePizzaDoughComplete}
        />
      )}

      {/* Simple Product Detail Drawer */}
      {simpleProduct && store && (
        <ProductDetailDrawer
          product={simpleProduct}
          categoryName={simpleProductCategoryName}
          storeId={store.id}
          isOpen={showProductDetailDrawer}
          onClose={() => {
            setShowProductDetailDrawer(false);
            setSimpleProduct(null);
          }}
          onNavigateToCategory={(categoryId) => {
            ui.setActiveCategory(categoryId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Loyalty Widget */}
      {store && <LoyaltyWidget storeId={store.id} storeName={store.name} />}
    </div>
  );
}
