// App.tsx - Anotô SaaS - Optimized Build
import { Suspense, lazy, useState, useEffect, memo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import { StoreStatusProvider } from "@/contexts/StoreStatusContext";
import TopProgressBar from "@/components/TopProgressBar";
import OfflineIndicator from "@/components/OfflineIndicator";
import { useRoutePreloader } from "@/hooks/useRoutePreloader";
import { useContentProtection } from "@/hooks/useContentProtection";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager loaded pages (critical path)
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

// Semi-eager loaded (frequently accessed)
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("@/pages/TermsOfUse"));
const FAQPage = lazy(() => import("@/pages/FAQPage"));

// Lazy loaded pages - Dashboard
const DashboardLayout = lazy(() => import("@/pages/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const OnboardingWizard = lazy(() => import("@/pages/dashboard/OnboardingWizard"));
const OrdersPage = lazy(() => import("@/pages/dashboard/OrdersPage"));
const ComandaPanel = lazy(() => import("@/pages/dashboard/ComandaPanel"));
const TablesPage = lazy(() => import("@/pages/dashboard/TablesPage"));
const PDVPage = lazy(() => import("@/pages/dashboard/PDVPage"));
const MenuManagerPage = lazy(() => import("@/pages/dashboard/MenuManagerPage"));
const CategoryEditorPage = lazy(() => import("@/pages/dashboard/CategoryEditorPage"));
const PizzaFlavorWizard = lazy(() => import("@/pages/dashboard/PizzaFlavorWizard"));
const PizzaFlavorsListPage = lazy(() => import("@/pages/dashboard/PizzaFlavorsListPage"));
const StandardItemWizard = lazy(() => import("@/pages/dashboard/StandardItemWizard"));
const MenuImagesPage = lazy(() => import("@/pages/dashboard/MenuImagesPage"));
const MenuBulkEditPage = lazy(() => import("@/pages/dashboard/MenuBulkEditPage"));
const FlowsPage = lazy(() => import("@/pages/dashboard/FlowsPage"));
const SettingsPage = lazy(() => import("@/pages/dashboard/SettingsPage"));
const AnalyticsPage = lazy(() => import("@/pages/dashboard/AnalyticsPage"));
const FinancialPage = lazy(() => import("@/pages/dashboard/FinancialPage"));
const BannersPage = lazy(() => import("@/pages/dashboard/BannersPage"));
const CouponsPage = lazy(() => import("@/pages/dashboard/CouponsPage"));
const CustomersPage = lazy(() => import("@/pages/dashboard/CustomersPage"));
const InventoryPage = lazy(() => import("@/pages/dashboard/InventoryPage"));
const IntegrationsPage = lazy(() => import("@/pages/dashboard/IntegrationsPage"));
const WhatsAppMessagesPage = lazy(() => import("@/pages/dashboard/WhatsAppMessagesPage"));
const SubscriptionPage = lazy(() => import("@/pages/dashboard/SubscriptionPage"));

// Storefront Pages
const StorefrontPage = lazy(() => import("@/pages/storefront/StorefrontPage"));
const CartPage = lazy(() => import("@/pages/storefront/CartPage"));
const OrderTrackingPage = lazy(() => import("@/pages/storefront/OrderTrackingPage"));
const OrderHistoryPage = lazy(() => import("@/pages/storefront/OrderHistoryPage"));
const ReviewsPage = lazy(() => import("@/pages/storefront/ReviewsPage"));
const CheckoutService = lazy(() => import("@/pages/CheckoutService"));
const CheckoutAddress = lazy(() => import("@/pages/CheckoutAddress"));
const CheckoutPayment = lazy(() => import("@/pages/CheckoutPayment"));
const CheckoutSummary = lazy(() => import("@/pages/CheckoutSummary"));

// PWA Install Page
const InstallPWA = lazy(() => import("@/pages/InstallPWA"));

// Aggressive caching for instant second-visit loading
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache persists
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      retry: 1, // Only retry once on failure
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Proteção global de conteúdo
  useContentProtection();
  
  // Preload critical routes
  useRoutePreloader();
  
  // Track navigation state - minimal delay
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  return (
    <>
      <TopProgressBar isLoading={isNavigating} />
      <Suspense fallback={null}>
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/explorar" element={<ExplorePage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/termos" element={<TermsOfUse />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/instalar" element={<InstallPWA />} />
          
          {/* Onboarding - fora do layout para tela cheia */}
          <Route path="/dashboard/onboarding" element={<OnboardingWizard />} />
          
          {/* Category Editor - fullscreen sem sidebar */}
          <Route path="/dashboard/category/new" element={<CategoryEditorPage />} />
          <Route path="/dashboard/category/edit" element={<CategoryEditorPage />} />
          
          {/* Pizza Flavor Wizard - fullscreen */}
          <Route path="/dashboard/pizza-flavor/new" element={<PizzaFlavorWizard />} />
          <Route path="/dashboard/pizza-flavor/edit" element={<PizzaFlavorWizard />} />
          <Route path="/dashboard/pizza-flavors" element={<PizzaFlavorsListPage />} />
          
          {/* Standard Item Wizard - fullscreen */}
          <Route path="/dashboard/item/new" element={<StandardItemWizard />} />
          <Route path="/dashboard/item/edit" element={<StandardItemWizard />} />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="comandas" element={<ComandaPanel />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="pdv" element={<PDVPage />} />
            <Route path="products" element={<MenuManagerPage />} />
            <Route path="menu-manager" element={<MenuManagerPage />} />
            <Route path="menu-images" element={<MenuImagesPage />} />
            <Route path="menu-bulk-edit" element={<MenuBulkEditPage />} />
            <Route path="flows" element={<FlowsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="financeiro" element={<FinancialPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="whatsapp-messages" element={<WhatsAppMessagesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>
          
          {/* Public Storefront */}
          <Route path="/cardapio/:slug" element={<StorefrontPage />} />
          <Route path="/cardapio/:slug/carrinho" element={<CartPage />} />
          <Route path="/cardapio/:slug/pedido/:orderNumber" element={<OrderTrackingPage />} />
          <Route path="/cardapio/:slug/meus-pedidos" element={<OrderHistoryPage />} />
          <Route path="/cardapio/:slug/avaliacoes" element={<ReviewsPage />} />
          <Route path="/cardapio/:slug/finalizar" element={<CheckoutService />} />
          <Route path="/cardapio/:slug/finalizar/endereco" element={<CheckoutAddress />} />
          <Route path="/cardapio/:slug/finalizar/pagamento" element={<CheckoutPayment />} />
          <Route path="/cardapio/:slug/finalizar/resumo" element={<CheckoutSummary />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

// Memoized App to prevent unnecessary re-renders
const App = memo(() => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <StoreStatusProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              <BrowserRouter>
                <AnimatedRoutes />
              </BrowserRouter>
            </StoreStatusProvider>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
));

App.displayName = "App";

export default App;