import { useEffect, useCallback } from "react";

// All dashboard routes for preloading
const dashboardRoutes: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/dashboard/DashboardHome"),
  "/dashboard/pdv": () => import("@/pages/dashboard/PDVPage"),
  "/dashboard/comandas": () => import("@/pages/dashboard/ComandaPanel"),
  "/dashboard/orders": () => import("@/pages/dashboard/OrdersPage"),
  "/dashboard/analytics": () => import("@/pages/dashboard/AnalyticsPage"),
  "/dashboard/customers": () => import("@/pages/dashboard/CustomersPage"),
  "/dashboard/products": () => import("@/pages/dashboard/MenuManagerPage"),
  "/dashboard/coupons": () => import("@/pages/dashboard/CouponsPage"),
  "/dashboard/banners": () => import("@/pages/dashboard/BannersPage"),
  "/dashboard/settings": () => import("@/pages/dashboard/SettingsPage"),
};

// Storefront routes (using dynamic slug pattern)
const storefrontRoutes: Record<string, () => Promise<unknown>> = {
  "/cardapio": () => import("@/pages/storefront/StorefrontPage"),
  "/order-tracking": () => import("@/pages/storefront/OrderTrackingPage"),
  "/order-history": () => import("@/pages/storefront/OrderHistoryPage"),
};

// Checkout routes (using dynamic slug pattern)
const checkoutRoutes: Record<string, () => Promise<unknown>> = {
  "/finalizar/servico": () => import("@/pages/CheckoutService"),
  "/finalizar/endereco": () => import("@/pages/CheckoutAddress"),
  "/finalizar/pagamento": () => import("@/pages/CheckoutPayment"),
  "/finalizar/resumo": () => import("@/pages/CheckoutSummary"),
};

const allRouteLoaders: Record<string, () => Promise<unknown>> = {
  ...dashboardRoutes,
  ...storefrontRoutes,
  ...checkoutRoutes,
};

// Cache for already loaded routes
const loadedRoutes = new Set<string>();

export function useRoutePreloader() {
  useEffect(() => {
    const preloadRoutes = () => {
      Object.entries(allRouteLoaders).forEach(([path, loader]) => {
        if (!loadedRoutes.has(path)) {
          loader()
            .then(() => loadedRoutes.add(path))
            .catch(() => {});
        }
      });
    };
    
    // Use requestIdleCallback for non-blocking preload
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(preloadRoutes);
    } else {
      setTimeout(preloadRoutes, 100);
    }
  }, []);
}

// Hook to prefetch a specific route on hover/focus - ultra fast
export function usePrefetchRoute(path: string) {
  const prefetch = useCallback(() => {
    if (loadedRoutes.has(path)) return;
    
    const loader = allRouteLoaders[path as keyof typeof allRouteLoaders];
    if (loader) {
      loader()
        .then(() => loadedRoutes.add(path))
        .catch(() => {});
    }
  }, [path]);

  return { 
    onMouseEnter: prefetch, 
    onFocus: prefetch,
    onTouchStart: prefetch 
  };
}

// Preload dashboard routes specifically
export function preloadDashboardRoutes() {
  Object.entries(dashboardRoutes).forEach(([path, loader]) => {
    if (!loadedRoutes.has(path)) {
      loader()
        .then(() => loadedRoutes.add(path))
        .catch(() => {});
    }
  });
}
