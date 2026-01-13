// Dashboard Layout - Anotô SaaS - Professional Design
import { useEffect, useState, useMemo, useCallback } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Image, ShoppingBag,
  Settings, CreditCard, LogOut, Menu, X, ExternalLink, Package,
  ChefHat, TicketPercent, Users, ChevronLeft, ChevronRight, TrendingUp,
  Monitor, UtensilsCrossed, ChevronDown, Workflow, Warehouse, Plug
} from "lucide-react";
import { QuickActionButtons } from "@/components/admin/QuickActionButtons";
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
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  showAlways: boolean;
  requiresComandaMode?: boolean;
  subItems?: { icon: React.ComponentType<{ className?: string }>; label: string; path: string }[];
}

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Início", path: "/dashboard", showAlways: true },
  { icon: Monitor, label: "PDV", path: "/dashboard/pdv", showAlways: true },
  { icon: UtensilsCrossed, label: "Mesas", path: "/dashboard/tables", showAlways: true },
  { icon: ChefHat, label: "Cozinha", path: "/dashboard/comandas", showAlways: false, requiresComandaMode: true },
  { icon: ShoppingBag, label: "Pedidos", path: "/dashboard/orders", showAlways: true },
  { icon: TrendingUp, label: "Analytics", path: "/dashboard/analytics", showAlways: true },
  { icon: Users, label: "Clientes", path: "/dashboard/customers", showAlways: true },
  { 
    icon: Package, 
    label: "Gestor de Cardápio", 
    path: "/dashboard/products", 
    showAlways: true,
    subItems: [
      { icon: Workflow, label: "Fluxos", path: "/dashboard/flows" }
    ]
  },
  { icon: Warehouse, label: "Estoque", path: "/dashboard/inventory", showAlways: true },
  { icon: TicketPercent, label: "Cupons", path: "/dashboard/coupons", showAlways: true },
  { icon: Image, label: "Banners", path: "/dashboard/banners", showAlways: true },
  { icon: Plug, label: "Integrações", path: "/dashboard/integrations", showAlways: true },
  { icon: Settings, label: "Configurações", path: "/dashboard/settings", showAlways: true },
  { icon: CreditCard, label: "Assinatura", path: "/dashboard/subscription", showAlways: true },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);
  const [showCloseStoreDialog, setShowCloseStoreDialog] = useState(false);

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
        .select("status, trial_ends_at")
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
    await supabase.auth.signOut();
    toast.success("Logout realizado!");
    navigate("/");
  };

  // Filter menu items based on comanda mode
  const menuItems = useMemo(() => allMenuItems.filter(item => {
    if (item.requiresComandaMode) {
      return store?.use_comanda_mode !== false;
    }
    return true;
  }), [store?.use_comanda_mode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-14 bg-sidebar border-r border-sidebar-border p-2 space-y-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
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
    isTrialExpired;

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

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      createRipple(e);
      if (sidebarCollapsed) {
        setAnimatingIcon(item.path);
        setTimeout(() => setAnimatingIcon(null), 400);
      }
    };

    // If has sub-items, render as expandable
    if (hasSubItems && !sidebarCollapsed) {
      return (
        <div>
          <button
            onClick={() => toggleMenuExpand(item.path)}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium outline-none transition-all duration-200",
              (isActive || isSubItemActive)
                ? "bg-amber-500 text-black shadow-md border border-amber-600" 
                : "bg-amber-400 text-black hover:bg-amber-500 border border-amber-500/50 shadow-sm"
            )}
          >
            <item.icon className="flex-shrink-0 w-4 h-4 text-black" />
            <span className="truncate flex-1 text-left">{item.label}</span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-black/60 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-amber-500/50 pl-2">
                  {/* Main item link */}
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-all duration-200",
                      isActive 
                        ? "bg-amber-500 text-black font-medium shadow-md border border-amber-600" 
                        : "bg-amber-400/80 text-black hover:bg-amber-500 border border-amber-500/40 shadow-sm"
                    )}
                    onMouseEnter={() => prefetchRoute(item.path)}
                  >
                    <Package className="w-3.5 h-3.5 text-black" />
                    <span>Produtos</span>
                  </Link>
                  
                  {/* Sub items */}
                  {item.subItems?.map(subItem => {
                    const isSubActive = location.pathname === subItem.path;
                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-all duration-200",
                          isSubActive 
                            ? "bg-amber-500 text-black font-medium shadow-md border border-amber-600" 
                            : "bg-amber-400/80 text-black hover:bg-amber-500 border border-amber-500/40 shadow-sm"
                        )}
                        onMouseEnter={() => prefetchRoute(subItem.path)}
                      >
                        <subItem.icon className="w-3.5 h-3.5 text-black" />
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
        onClick={handleClick}
        className={cn(
          "ripple-container flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium outline-none transition-all duration-200 relative",
          isActive 
            ? "bg-amber-500 text-black shadow-md border border-amber-600" 
            : "bg-amber-400 text-black hover:bg-amber-500 border border-amber-500/50 shadow-sm",
          sidebarCollapsed && "justify-center px-2"
        )}
        onMouseEnter={() => prefetchRoute(item.path)}
        onTouchStart={() => prefetchRoute(item.path)}
      >
        <div className="relative">
          <item.icon className={cn(
            "flex-shrink-0 text-black",
            sidebarCollapsed ? "w-[18px] h-[18px]" : "w-4 h-4",
            sidebarCollapsed ? "w-[18px] h-[18px]" : "w-4 h-4",
            sidebarCollapsed && animatingIcon === item.path && "animate-icon-spin"
          )} />
          {/* Badge for pending orders */}
          {item.path === "/dashboard/orders" && pendingOrdersCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center",
                "bg-red-600 text-white text-[10px] font-bold rounded-full px-1",
                sidebarCollapsed && "-top-1 -right-1"
              )}
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
          <TooltipContent side="right" className="text-xs font-medium">
            {item.label}
            {hasSubItems && item.subItems && (
              <div className="mt-1 pt-1 border-t border-border/50 space-y-0.5">
                {item.subItems.map(sub => (
                  <Link 
                    key={sub.path} 
                    to={sub.path}
                    className="block text-muted-foreground hover:text-foreground py-0.5"
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

  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex w-full overflow-hidden">
        {/* Sidebar - Desktop - Clean & Minimal */}
        <motion.aside 
          layout
          initial={false}
          animate={{ width: sidebarCollapsed ? 56 : 208 }}
          transition={{ 
            duration: 0.25, 
            ease: [0.25, 0.1, 0.25, 1] 
          }}
          className={cn(
            "hidden md:flex flex-col h-screen flex-shrink-0 relative group/sidebar",
            "bg-gray-800 border-r border-amber-400/50"
          )}
        >
          {/* Collapse Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "absolute -right-2.5 top-14 z-50 flex h-5 w-5 items-center justify-center",
              "rounded-full bg-amber-400 border border-amber-500 shadow-md",
              "text-gray-900 hover:bg-amber-300",
              "transition-all duration-150 opacity-0 group-hover/sidebar:opacity-100",
              "focus:opacity-100 focus:outline-none"
            )}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <motion.div
              animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          </button>

          {/* Logo - Compact */}
          <div 
            className={cn(
              "h-12 flex items-center flex-shrink-0 overflow-hidden",
              "transition-all duration-200",
              sidebarCollapsed ? "justify-center px-2" : "px-3",
              "border-b border-amber-400/30"
            )}
          >
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <motion.div
                layout
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                {store?.logo_url ? (
                  <img 
                    src={store.logo_url} 
                    alt={store.name} 
                    className="w-8 h-8 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shadow-sm">
                    <span className="text-gray-900 font-bold text-sm">
                      {store?.name?.charAt(0) || "A"}
                    </span>
                  </div>
                )}
              </motion.div>
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="font-bold text-[13px] text-white truncate"
                  >
                    {store?.name || "Anotô?"}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Store Status Toggle */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (!store) return;
                  if (store.is_open_override) {
                    // Show confirmation before closing
                    setShowCloseStoreDialog(true);
                  } else {
                    // Open immediately
                    handleToggleStoreStatus(true);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 w-full transition-colors",
                  sidebarCollapsed ? "justify-center p-1.5" : "px-3 py-1.5",
                  store?.is_open_override 
                    ? "bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40"
                    : "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40"
                )}
              >
                <motion.div
                  animate={{ 
                    scale: store?.is_open_override ? [1, 1.3, 1] : 1,
                    opacity: store?.is_open_override ? [1, 0.6, 1] : 1
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: store?.is_open_override ? Infinity : 0, 
                    ease: "easeInOut"
                  }}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                    store?.is_open_override 
                      ? "bg-green-600 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]" 
                      : "bg-red-600 shadow-[0_0_6px_2px_rgba(239,68,68,0.5)]"
                  )}
                />
                <AnimatePresence mode="wait">
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "text-[11px] font-medium",
                        store?.is_open_override ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {store?.is_open_override ? "Loja Aberta" : "Loja Fechada"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right" className="text-xs font-medium">
                {store?.is_open_override ? "Loja Aberta - Clique para fechar" : "Loja Fechada - Clique para abrir"}
              </TooltipContent>
            )}
          </Tooltip>

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

          {/* Menu - Scrollable */}
          <nav className="flex-1 p-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {menuItems.map(item => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>

          {/* Footer - Fixed Bottom */}
          <div 
            className={cn(
              "p-1.5 space-y-0.5 flex-shrink-0 overflow-hidden",
              sidebarCollapsed && "flex flex-col items-center",
              "border-t border-amber-400/30"
            )}
          >
            {/* Theme Toggle */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div>
                  <ThemeToggle variant="sidebar" collapsed={sidebarCollapsed} />
                </div>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="text-xs font-medium">Tema</TooltipContent>
              )}
            </Tooltip>

            {/* Store Link */}
            {store && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <a
                    href={`/cardapio/${store.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 text-xs text-gray-300 hover:text-amber-400 transition-colors rounded-lg hover:bg-gray-700/50",
                      sidebarCollapsed ? "p-1.5 justify-center" : "px-2.5 py-1.5"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-amber-400/70" />
                    <AnimatePresence mode="wait">
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Ver cardápio
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </a>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" className="text-xs font-medium">Ver cardápio</TooltipContent>
                )}
              </Tooltip>
            )}

            {/* Logout */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className={cn(
                    "flex items-center gap-2 text-xs text-gray-300 hover:text-red-400 transition-colors w-full rounded-lg hover:bg-red-900/30",
                    sidebarCollapsed ? "p-1.5 justify-center" : "px-2.5 py-1.5"
                  )}
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <AnimatePresence mode="wait">
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Sair
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="text-xs font-medium">Sair</TooltipContent>
              )}
            </Tooltip>
          </div>
        </motion.aside>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-background/95 backdrop-blur-sm border-b border-border px-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            {store?.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-7 h-7 rounded-md object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">{store?.name?.charAt(0) || "A"}</span>
              </div>
            )}
            <span className="font-semibold text-[13px]">{store?.name || "Anotô?"}</span>
          </Link>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="md:hidden fixed right-0 top-0 bottom-0 w-56 bg-sidebar z-50 flex flex-col shadow-xl"
              >
                <div className="h-12 border-b border-sidebar-border px-3 flex items-center justify-between flex-shrink-0">
                  <span className="font-semibold text-[13px] text-sidebar-foreground">Menu</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSidebarOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <nav className="flex-1 p-1.5 space-y-0.5 overflow-y-auto">
                  {menuItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                        location.pathname === item.path
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-sidebar-border p-1.5 space-y-0.5 flex-shrink-0">
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-xs text-sidebar-foreground/60">Tema</span>
                    <ThemeToggle variant="simple" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-xs text-destructive w-full px-2.5 py-1.5 rounded-md hover:bg-destructive/10"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content - Independent Scroll */}
        <main className="flex-1 h-screen overflow-y-auto bg-background relative">
          {/* Quick Action Buttons - Top Right */}
          <QuickActionButtons 
            store={store} 
            onStoreUpdate={(updates) => setStore(prev => prev ? { ...prev, ...updates } : null)} 
          />

          <div className="md:p-5 p-3 pt-20 md:pt-16">
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

            {/* Page Content */}
            <Outlet context={{ store, subscription, refreshStore: checkAuth }} />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
