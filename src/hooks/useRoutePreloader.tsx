import { useEffect, useCallback } from "react";

// All dashboard routes for preloading
const dashboardRoutes = {
  "/dashboard": () => import("@/pages/dashboard/DashboardHome"),
  "/dashboard/pdv": () => import("@/pages/dashboard/PDVPage"),
  "/dashboard/tables": () => import("@/pages/dashboard/TablesPage"),
  "/dashboard/comandas": () => import("@/pages/dashboard/ComandaPanel"),
  "/dashboard/orders": () => import("@/pages/dashboard/OrdersPage"),
  "/dashboard/analytics": () => import("@/pages/dashboard/AnalyticsPage"),
  "/dashboard/customers": () => import("@/pages/dashboard/CustomersPage"),
  "/dashboard/products": () => import("@/pages/dashboard/MenuManagerPage"),
  "/dashboard/coupons": () => import("@/pages/dashboard/CouponsPage"),
  "/dashboard/banners": () => import("@/pages/dashboard/BannersPage"),
  "/dashboard/settings": () => import("@/pages/dashboard/SettingsPage"),
};

// Storefront routes
const storefrontRoutes = {
  "/storefront": () => import("@/pages/storefront/StorefrontPage"),
  "/cart": () => import("@/pages/storefront/CartPage"),
  "/order-tracking": () => import("@/pages/storefront/OrderTrackingPage"),
  "/order-history": () => import("@/pages/storefront/OrderHistoryPage"),
};

// Checkout routes
const checkoutRoutes = {
  "/checkout/service": () => import("@/pages/CheckoutService"),
  "/checkout/address": () => import("@/pages/CheckoutAddress"),
  "/checkout/payment": () => import("@/pages/CheckoutPayment"),
  "/checkout/summary": () => import("@/pages/CheckoutSummary"),
};

const allRouteLoaders = {
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
