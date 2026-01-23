// Dashboard Layout - Anotô SaaS - Professional Design with macOS-style sidebar
import { useEffect, useState, useMemo, useCallback } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Image, ShoppingBag,
  Settings, CreditCard, LogOut, Menu, X, ExternalLink, Package,
  ChefHat, TicketPercent, Users, ChevronLeft, ChevronRight, TrendingUp,
  Monitor, UtensilsCrossed, ChevronDown, Warehouse, Plug, Maximize, Minimize, DollarSign,
  ClipboardList, UserCircle
} from "lucide-react";
import { QuickActionButtons } from "@/components/admin/QuickActionButtons";
import { DashboardBottomNav } from "@/components/admin/DashboardBottomNav";
import { MobileMoreDrawer } from "@/components/admin/MobileMoreDrawer";
import { PageTransition } from "@/components/admin/PageTransition";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMenuThemeClasses, getCustomColorStyles, MENU_THEMES } from "@/components/admin/MenuThemeSelector";
import { preloadDashboardRoutes } from "@/hooks/useRoutePreloader";
import { useStockNotifications } from "@/hooks/useStockNotifications";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStaffAuth, canAccessRoute, getDefaultRouteForRole, type StaffRole } from "@/hooks/useStaffAuth";
import { SubscriptionBlockOverlay } from "@/components/admin/SubscriptionBlockOverlay";

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  onboarding_completed: boolean;
  use_comanda_mode?: boolean;
  sidebar_color?: string;
  is_open_override?: boolean | null;
  printnode_auto_print?: boolean | null;
}

interface Subscription {
  status: string;
  trial_ends_at: string | null;
  created_at: string | null;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  showAlways: boolean;
  requiresComandaMode?: boolean;
  subItems?: { icon: React.ComponentType<{ className?: string }>; label: string; path: string }[];
  allowedRoles?: StaffRole[];
  staffOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Início", path: "/dashboard", showAlways: true, allowedRoles: ['admin'] },
  { icon: Monitor, label: "PDV", path: "/dashboard/pdv", showAlways: true, allowedRoles: ['admin'] },
  { icon: Monitor, label: "Fazer Pedido", path: "/dashboard/waiter-pos", showAlways: true, allowedRoles: ['garcom'], staffOnly: true },
  { icon: ChefHat, label: "Cozinha", path: "/dashboard/comandas", showAlways: false, requiresComandaMode: true, allowedRoles: ['admin'] },
  { icon: ClipboardList, label: "Meus Pedidos", path: "/dashboard/waiter-orders", showAlways: true, allowedRoles: ['garcom'], staffOnly: true },
  { icon: ShoppingBag, label: "Pedidos", path: "/dashboard/orders", showAlways: true, allowedRoles: ['admin'] },
  { icon: TrendingUp, label: "Analytics", path: "/dashboard/analytics", showAlways: true, allowedRoles: ['admin'] },
  { icon: DollarSign, label: "Financeiro", path: "/dashboard/financeiro", showAlways: true, allowedRoles: ['admin'] },
  { icon: Users, label: "Clientes", path: "/dashboard/customers", showAlways: true, allowedRoles: ['admin'] },
  { 
    icon: Package, 
    label: "Gestor de Cardápio", 
    path: "/dashboard/products", 
    showAlways: true,
    allowedRoles: ['admin'],
    subItems: [
      { icon: Image, label: "Modais", path: "/dashboard/menu-images" },
      { icon: Warehouse, label: "Estoque", path: "/dashboard/inventory" },
      { icon: TicketPercent, label: "Cupons", path: "/dashboard/coupons" },
      { icon: Image, label: "Banners", path: "/dashboard/banners" },
    ]
  },
  { icon: Plug, label: "Integrações", path: "/dashboard/integrations", showAlways: true, allowedRoles: ['admin'] },
  { icon: Settings, label: "Configurações", path: "/dashboard/settings", showAlways: true, allowedRoles: ['admin'] },
  { icon: CreditCard, label: "Assinatura", path: "/dashboard/subscription", showAlways: true, allowedRoles: ['admin'] },
  { icon: UserCircle, label: "Meu Perfil", path: "/dashboard/profile", showAlways: true, allowedRoles: ['garcom'], staffOnly: true },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isStaffLoggedIn, role, name: staffName, logout: staffLogout, loading: staffLoading } = useStaffAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);
  const [showCloseStoreDialog, setShowCloseStoreDialog] = useState(false);

  // Check if on PDV page for fullscreen button
  const isPDVPage = location.pathname === "/dashboard/pdv";

  // Check route access for staff - wait for everything to load
  useEffect(() => {
    // Skip check during loading
    if (loading || staffLoading) return;
    
    // Only check access for staff members (not admin via Supabase Auth)
    // Also ensure store is loaded to avoid false negatives
    if (isStaffLoggedIn && role && store) {
      const hasAccess = canAccessRoute(location.pathname, role);
      if (!hasAccess) {
        const defaultRoute = getDefaultRouteForRole(role);
        toast.error("Acesso não autorizado");
        navigate(defaultRoute, { replace: true });
      }
    }
  }, [location.pathname, isStaffLoggedIn, role, loading, staffLoading, navigate, store]);
  // Auto-expand menu if current path is a subitem
  useEffect(() => {
    allMenuItems.forEach(item => {
      if (item.subItems?.some(sub => location.pathname === sub.path)) {
        setExpandedMenus(prev => prev.includes(item.path) ? prev : [...prev, item.path]);
      }
    });
  }, [location.pathname]);

  // Stock notifications - realtime alerts when products reach low stock
  useStockNotifications({ storeId: store?.id ?? null });

  // Pending orders count - realtime updates
  const pendingOrdersCount = usePendingOrdersCount(store?.id ?? null);

  const sidebarTheme = useMemo(() => {
    const themeId = store?.sidebar_color || "amber";
    const classes = getMenuThemeClasses(themeId);
    const theme = MENU_THEMES.find(t => t.id === themeId);
    
    return {
      ...classes,
      theme,
      isCustom: classes.isCustom,
      customStyles: classes.isCustom && classes.customColor ? getCustomColorStyles(classes.customColor) : null
    };
  }, [store?.sidebar_color]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Real-time subscription for store updates (sidebar color, etc)
  useEffect(() => {
    if (!store?.id) return;

    const channel = supabase
      .channel('store-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stores',
          filter: `id=eq.${store.id}`
        },
        (payload) => {
          // Update store state with new data instantly
          setStore(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id]);

  // Atalho de teclado para PDV (Shift+F8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F8') {
        e.preventDefault();
        navigate('/dashboard/pdv');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  // Preload all dashboard routes on mount for instant navigation
  useEffect(() => {
    preloadDashboardRoutes();
  }, []);

  // Route prefetch cache
  const prefetchedRoutes = useMemo(() => new Set<string>(), []);
  
  const prefetchRoute = useCallback((path: string) => {
    if (prefetchedRoutes.has(path)) return;
    prefetchedRoutes.add(path);
    
    // Dynamic import based on path
    const routeImports: Record<string, () => Promise<unknown>> = {
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
    
    const loader = routeImports[path];
    if (loader) loader().catch(() => {});
  }, [prefetchedRoutes]);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const checkAuth = async () => {
    try {
      // First check if staff is logged in via localStorage
      const staffSession = localStorage.getItem('staff_session');
      if (staffSession) {
        try {
          const parsed = JSON.parse(staffSession);
          const staffStoreId = parsed.storeId || parsed.store_id;
          
          if (staffStoreId) {
            // Staff is logged in - load store data directly
            const { data: storeData } = await supabase
              .from("stores")
              .select("*")
              .eq("id", staffStoreId)
              .maybeSingle();

            if (storeData) {
              setStore(storeData);
            }

            const { data: subData } = await supabase
              .from("subscriptions")
              .select("status, trial_ends_at, created_at")
              .eq("store_id", staffStoreId)
              .maybeSingle();

            if (subData) {
              setSubscription(subData);
            }
            
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing staff session:", e);
          localStorage.removeItem('staff_session');
        }
      }

      // Check Supabase Auth for admin users
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, is_owner")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.store_id) {
        // User is logged in but has no store - redirect to onboarding
        navigate("/dashboard/onboarding");
        return;
      }

      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", profile.store_id)
        .maybeSingle();

      if (storeData) {
        setStore(storeData);
      }

      const { data: subData } = await supabase
        .from("subscriptions")
        .select("status, trial_ends_at, created_at")
        .eq("store_id", profile.store_id)
        .maybeSingle();

      if (subData) {
        setSubscription(subData);
      }

    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isStaffLoggedIn) {
      staffLogout();
    } else {
      await supabase.auth.signOut();
      toast.success("Logout realizado!");
      navigate("/");
    }
  };

  // Filter menu items based on comanda mode and role
  const menuItems = useMemo(() => allMenuItems.filter(item => {
    // Filter by comanda mode
    if (item.requiresComandaMode && store?.use_comanda_mode === false) {
      return false;
    }
    
    // If staff is logged in, filter by role
    if (isStaffLoggedIn && role) {
      if (item.allowedRoles && !item.allowedRoles.includes(role)) {
        return false;
      }
    } else {
      // Admin via Supabase Auth - hide staff-only items
      if (item.staffOnly) {
        return false;
      }
    }
    
    return true;
  }), [store?.use_comanda_mode, isStaffLoggedIn, role]);

  if (loading || staffLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-14 bg-[#FFBE00] border-r border-[#e5a800] p-2 space-y-2">
          <Skeleton className="h-8 w-8 rounded-md bg-amber-600/30" />
          <Skeleton className="h-7 w-7 rounded-md bg-amber-600/30" />
          <Skeleton className="h-7 w-7 rounded-md bg-amber-600/30" />
          <Skeleton className="h-7 w-7 rounded-md bg-amber-600/30" />
        </div>
        <div className="flex-1 p-5">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const isTrialExpired = subscription?.status === "trial" && 
    subscription?.trial_ends_at && 
    new Date(subscription.trial_ends_at) < new Date();

  const isSubscriptionInactive = subscription?.status === "canceled" || 
    subscription?.status === "unpaid" || 
    subscription?.status === "expired" ||
    subscription?.status === "past_due" ||
    isTrialExpired;

  // Block access to dashboard if subscription is inactive (except subscription page)
  const isOnSubscriptionPage = location.pathname === "/dashboard/subscription";
  
  if (isSubscriptionInactive && !isOnSubscriptionPage && !isStaffLoggedIn) {
    return (
      <SubscriptionBlockOverlay
        isTrialExpired={isTrialExpired}
        onGoToSubscription={() => navigate("/dashboard/subscription")}
        onLogout={handleLogout}
      />
    );
  }

  const toggleMenuExpand = (path: string) => {
    setExpandedMenus(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleToggleStoreStatus = async (newStatus: boolean) => {
    if (!store) return;
    await supabase
      .from("stores")
      .update({ is_open_override: newStatus })
      .eq("id", store.id);
    setStore(prev => prev ? { ...prev, is_open_override: newStatus } : null);
    toast.success(newStatus ? "Loja aberta!" : "Loja fechada!");
  };

  // Track which icon was just clicked for animation

  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 500);
  };

  const NavItem = ({ item }: { item: MenuItem }) => {
    const isActive = location.pathname === item.path;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedMenus.includes(item.path);
    const isSubItemActive = item.subItems?.some(sub => location.pathname === sub.path);

    // Expandable menu with sub-items
    if (hasSubItems && !sidebarCollapsed) {
      return (
        <div className="relative">
          <button
            onClick={() => toggleMenuExpand(item.path)}
            className={cn(
              "w-full flex items-center gap-2 px-1.5 py-1 text-[11px] font-medium outline-none transition-all duration-200 rounded-lg",
              (isActive || isSubItemActive) 
                ? "bg-gray-900 text-white shadow-md" 
                : "text-gray-800 hover:bg-white/40"
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
              (isActive || isSubItemActive) 
                ? "bg-white/20" 
                : "bg-white/60"
            )}>
              <item.icon className="w-3.5 h-3.5" />
            </div>
            <span className="truncate flex-1 text-left">{item.label}</span>
            <ChevronDown className={cn(
              "w-3 h-3 opacity-60 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-0.5 ml-2 space-y-0.5 pl-3 border-l border-gray-800/20">
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                      isActive 
                        ? "bg-gray-900 text-white shadow-sm" 
                        : "text-gray-700 hover:bg-white/50"
                    )}
                    onMouseEnter={() => prefetchRoute(item.path)}
                  >
                    <Package className="w-3 h-3" />
                    <span>Produtos</span>
                  </Link>
                  
                  {item.subItems?.map(subItem => {
                    const isSubActive = location.pathname === subItem.path;
                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                          isSubActive 
                            ? "bg-gray-900 text-white shadow-sm" 
                            : "text-gray-700 hover:bg-white/50"
                        )}
                        onMouseEnter={() => prefetchRoute(subItem.path)}
                      >
                        <subItem.icon className="w-3 h-3" />
                        <span>{subItem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    
    const content = (
      <Link
        to={item.path}
        className={cn(
          "relative flex items-center gap-2 text-[11px] font-medium outline-none transition-all duration-200 rounded-lg",
          sidebarCollapsed ? "p-1.5 justify-center" : "px-1.5 py-1",
          isActive 
            ? "bg-gray-900 text-white shadow-md" 
            : "text-gray-800 hover:bg-white/40"
        )}
        onMouseEnter={() => prefetchRoute(item.path)}
        onTouchStart={() => prefetchRoute(item.path)}
      >
        <div className={cn(
          "relative flex items-center justify-center transition-all rounded-lg flex-shrink-0",
          sidebarCollapsed ? "w-7 h-7" : "w-6 h-6",
          isActive ? "bg-white/20" : "bg-white/60"
        )}>
          <item.icon className={cn(sidebarCollapsed ? "w-4 h-4" : "w-3.5 h-3.5")} />
          {/* Badge for pending orders */}
          {item.path === "/dashboard/orders" && pendingOrdersCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-0.5 shadow-sm border border-amber-400"
            >
              {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
            </motion.span>
          )}
        </div>
        {!sidebarCollapsed && (
          <span className="truncate flex-1">
            {item.label}
          </span>
        )}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={8}
            className="text-[10px] font-medium bg-gray-900 text-white border-0 shadow-xl"
          >
            {item.label}
            {hasSubItems && item.subItems && (
              <div className="mt-1 pt-1 border-t border-white/20 space-y-0.5">
                {item.subItems.map(sub => (
                  <Link 
                    key={sub.path} 
                    to={sub.path}
                    className="block text-white/70 hover:text-white py-0.5 transition-colors"
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  // Hide sidebar on mobile completely (use bottom nav instead)
  // Show mobile bottom nav on ALL mobile pages including PDV - always visible for quick access
  const showMobileNav = isMobile;
  
  // Hide sidebar only on mobile (mobile uses bottom nav)
  const hideSidebar = isMobile;

  return (
    <TooltipProvider>
      <div className={cn(
        "h-screen bg-background flex w-full overflow-hidden",
        showMobileNav && "pb-16" // Padding for bottom nav - increased for better spacing
      )}>
        {/* Sidebar - Desktop - Premium Amber Design */}
        {!hideSidebar && (
          <motion.aside 
            layout
            initial={false}
            animate={{ width: sidebarCollapsed ? 64 : 240 }}
            transition={{ 
              duration: 0.3, 
              ease: [0.4, 0, 0.2, 1] 
            }}
            className={cn(
              "hidden md:flex flex-col h-screen flex-shrink-0 relative group/sidebar",
              "bg-gradient-to-b from-amber-400 via-amber-400 to-amber-500"
            )}
            style={{
              boxShadow: "inset -1px 0 0 rgba(0,0,0,0.08)"
            }}
          >
          {/* Subtle pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />

          {/* Collapse Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "absolute -right-3 top-16 z-50 flex h-6 w-6 items-center justify-center",
              "rounded-full bg-white border border-gray-200 shadow-lg",
              "text-gray-600 hover:bg-gray-50 hover:scale-110",
              "transition-all duration-200 opacity-0 group-hover/sidebar:opacity-100",
              "focus:opacity-100 focus:outline-none"
            )}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <motion.div
              animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.div>
          </button>

          {/* Logo Section - Compact */}
          <div 
            className={cn(
              "flex items-center flex-shrink-0 overflow-hidden relative",
              "transition-all duration-300",
              sidebarCollapsed ? "h-12 justify-center px-2" : "h-12 px-3"
            )}
          >
            <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
              <motion.div
                layout
                transition={{ duration: 0.2 }}
                className="relative"
              >
                {store?.logo_url ? (
                  <img 
                    src={store.logo_url} 
                    alt={store.name} 
                    className="w-8 h-8 rounded-lg object-cover shadow-md ring-1 ring-white/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-md ring-1 ring-white/30">
                    <span className="text-amber-400 font-bold text-sm">
                      {store?.name?.charAt(0) || "A"}
                    </span>
                  </div>
                )}
              </motion.div>
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col min-w-0"
                  >
                    <span className="font-bold text-[11px] text-gray-900 truncate">
                      {store?.name || "Anotô?"}
                    </span>
                    <span className="text-[9px] text-gray-700/70 font-medium">
                      Sistema de Delivery
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Store Status Toggle - Compact */}
          <div className={cn(
            "mx-2 mb-2",
            sidebarCollapsed && "mx-1.5"
          )}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (!store) return;
                    if (store.is_open_override) {
                      setShowCloseStoreDialog(true);
                    } else {
                      handleToggleStoreStatus(true);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg transition-all duration-200",
                    sidebarCollapsed ? "justify-center p-2" : "px-2.5 py-1.5",
                    store?.is_open_override 
                      ? "bg-emerald-500 shadow-md shadow-emerald-500/20"
                      : "bg-gray-900/90 shadow-md"
                  )}
                >
                  <motion.div
                    animate={{ 
                      scale: store?.is_open_override ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: store?.is_open_override ? Infinity : 0, 
                      ease: "easeInOut"
                    }}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      store?.is_open_override 
                        ? "bg-white" 
                        : "bg-red-400"
                    )}
                  />
                  <AnimatePresence mode="wait">
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] font-semibold text-white"
                      >
                        {store?.is_open_override ? "Aberta" : "Fechada"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" sideOffset={8} className="text-[10px] font-medium bg-gray-900 text-white border-0">
                  {store?.is_open_override ? "Loja Aberta" : "Loja Fechada"}
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          <AlertDialog open={showCloseStoreDialog} onOpenChange={setShowCloseStoreDialog}>
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base">Fechar a loja?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Ao fechar a loja, os clientes não poderão fazer novos pedidos até que você abra novamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleToggleStoreStatus(false)}
                  className="h-8 text-xs bg-destructive hover:bg-destructive/90"
                >
                  Fechar loja
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Menu Navigation - Distributed */}
          <nav className={cn(
            "flex-1 py-3 space-y-1.5 overflow-y-auto overflow-x-hidden flex flex-col",
            "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-900/10 [&::-webkit-scrollbar-thumb]:rounded-full",
            sidebarCollapsed ? "px-1.5" : "px-2"
          )}>
            {menuItems.map((item, index) => (
              <div key={item.path} className={cn(
                index === menuItems.length - 1 && "mt-auto"
              )}>
                <NavItem item={item} />
              </div>
            ))}
          </nav>

          {/* Footer - Ultra Compact */}
          <div 
            className={cn(
              "flex-shrink-0 overflow-hidden",
              sidebarCollapsed ? "px-1.5 py-2" : "px-2 py-2"
            )}
          >
            {/* Divider */}
            <div className="h-px bg-gray-900/10 mb-2" />
            
            {/* Compact Footer Actions */}
            <div className={cn(
              "flex items-center",
              sidebarCollapsed ? "flex-col gap-1.5" : "justify-between"
            )}>
              {/* Theme Toggle */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeToggle variant="sidebar" collapsed={sidebarCollapsed} compact />
                  </div>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" sideOffset={8} className="text-[10px] font-medium bg-gray-900 text-white border-0">
                    Tema
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Store Link */}
              {store && !sidebarCollapsed && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <a
                      href={`/cardapio/${store.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Cardápio</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] font-medium bg-gray-900 text-white border-0">
                    Abrir cardápio
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Store Link - Collapsed */}
              {store && sidebarCollapsed && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <a
                      href={`/cardapio/${store.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-white/40 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-[10px] font-medium bg-gray-900 text-white border-0">
                    Ver cardápio
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Logout */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "flex items-center transition-all",
                      sidebarCollapsed 
                        ? "justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-500/20" 
                        : "gap-1 text-[10px] font-medium text-red-600 hover:text-red-700"
                    )}
                  >
                    <LogOut className={sidebarCollapsed ? "w-3.5 h-3.5" : "w-3 h-3"} />
                    {!sidebarCollapsed && <span>Sair</span>}
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side={sidebarCollapsed ? "right" : "top"} 
                  sideOffset={8}
                  className="text-[10px] font-medium bg-gray-900 text-white border-0"
                >
                  Sair
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.aside>
        )}

        {/* Mobile Sidebar Sheet - Only shown on desktop when toggled */}
        {/* Mobile navigation now handled by MobileMoreDrawer */}

        {/* Main Content - Independent Scroll */}
        <main className="flex-1 h-screen overflow-y-auto bg-background relative">
          {/* Quick Action Buttons - Top Right */}
          <QuickActionButtons 
            store={store} 
            onStoreUpdate={(updates) => setStore(prev => prev ? { ...prev, ...updates } : null)} 
          />

          <div className={cn(
            "md:p-5 p-2.5",
            showMobileNav ? "pt-2 pb-24" : "pt-3",
            "md:pt-16 md:pb-5"
          )}>
            {/* Trial/Subscription Warning */}
            {isSubscriptionInactive && location.pathname !== "/dashboard/subscription" && (
              <div className="mb-4 p-2.5 bg-destructive/10 border border-destructive/20 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-destructive text-[13px]">
                    {isTrialExpired ? "Período de teste expirou" : "Assinatura inativa"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Renove para continuar usando
                  </p>
                </div>
                <Button asChild size="sm" variant="destructive" className="h-7 text-xs">
                  <Link to="/dashboard/subscription">Renovar</Link>
                </Button>
              </div>
            )}

            {/* Page Content with Transition */}
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet context={{ store, subscription, refreshStore: checkAuth }} />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {showMobileNav && (
          <DashboardBottomNav
            isStoreOpen={store?.is_open_override ?? false}
            pendingOrdersCount={pendingOrdersCount}
            onMoreClick={() => setSidebarOpen(true)}
          />
        )}

        {/* Mobile More Drawer */}
        <MobileMoreDrawer
          open={sidebarOpen && isMobile}
          onClose={() => setSidebarOpen(false)}
          store={store}
          onLogout={handleLogout}
        />
      </div>
    </TooltipProvider>
  );
}
