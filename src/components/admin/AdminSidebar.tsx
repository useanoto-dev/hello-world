import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Pizza,
  Users,
  Ticket,
  Settings,
  BarChart3,
  LogOut,
  ExternalLink,
  ClipboardList,
  ImageIcon,
  ChefHat,
  UtensilsCrossed,
  CreditCard,
  ChevronRight,
  Menu,
  Image,
  Edit3,
  GitBranch,
  Plug,
  MessageSquare,
  UserCog,
  Activity,
  Package,
  DollarSign,
  UserCircle,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStaffAuth, type StaffRole } from "@/hooks/useStaffAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Menu item with role permissions
interface MenuItemWithRoles {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: StaffRole[]; // undefined = only admin (Supabase Auth)
  staffOnly?: boolean; // Items only for staff, not admin (Supabase Auth)
}

// Quick access items - PDV is admin only
const quickAccessItems: MenuItemWithRoles[] = [
  { title: "PDV", url: "/dashboard/pdv", icon: CreditCard, allowedRoles: ['admin'] },
];

// Operational items
const operationalItems: MenuItemWithRoles[] = [
  { title: "Mesas", url: "/dashboard/tables", icon: UtensilsCrossed, allowedRoles: ['admin', 'garcom'] },
  { title: "Cozinha", url: "/dashboard/comandas", icon: ChefHat, allowedRoles: ['admin'] },
  { title: "Meus Pedidos", url: "/dashboard/my-orders", icon: Receipt, allowedRoles: ['garcom'], staffOnly: true },
];

// Submenu do Gestor de Cardápio - only admin
const menuManagerSubItems: MenuItemWithRoles[] = [
  { title: "Gestor", url: "/dashboard/products", icon: Menu },
  { title: "Sabores de Pizza", url: "/dashboard/pizza-flavors", icon: Pizza },
  { title: "Fluxos", url: "/dashboard/flows", icon: GitBranch },
  { title: "Imagens", url: "/dashboard/menu-images", icon: Image },
  { title: "Edição em massa", url: "/dashboard/menu-bulk-edit", icon: Edit3 },
];

// Management items
const managementItems: MenuItemWithRoles[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pedidos", url: "/dashboard/orders", icon: ClipboardList, allowedRoles: ['admin'] },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package },
  { title: "Banners", url: "/dashboard/banners", icon: ImageIcon },
  { title: "Clientes", url: "/dashboard/customers", icon: Users },
  { title: "Cupons", url: "/dashboard/coupons", icon: Ticket },
  { title: "Financeiro", url: "/dashboard/financeiro", icon: DollarSign },
  { title: "Relatórios", url: "/dashboard/analytics", icon: BarChart3, allowedRoles: ['admin'] },
  { title: "Integrações", url: "/dashboard/integrations", icon: Plug },
  { title: "WhatsApp", url: "/dashboard/whatsapp-messages", icon: MessageSquare },
  { title: "Garçons", url: "/dashboard/staff", icon: UserCog },
  { title: "Auditoria", url: "/dashboard/audit", icon: Activity },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

// Staff-only profile item
const staffProfileItem: MenuItemWithRoles = {
  title: "Meu Perfil",
  url: "/dashboard/profile",
  icon: UserCircle,
  allowedRoles: ['garcom'],
  staffOnly: true,
};

interface AdminSidebarProps {
  isDark?: boolean;
}

export default function AdminSidebar({ isDark = false }: AdminSidebarProps) {
  const { signOut, user, profile } = useAuth();
  const { isStaffLoggedIn, role: staffRole, name: staffName, logout: staffLogout } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  
  // Check if current route is within menu manager section
  const isMenuManagerActive = location.pathname.startsWith("/dashboard/products") ||
    location.pathname.startsWith("/dashboard/menu-manager") ||
    location.pathname.startsWith("/dashboard/menu-images") ||
    location.pathname.startsWith("/dashboard/menu-bulk-edit") ||
    location.pathname.startsWith("/dashboard/pizza-flavor") ||
    location.pathname.startsWith("/dashboard/flows");
  
  const [menuManagerOpen, setMenuManagerOpen] = useState(isMenuManagerActive);

  // Filter menu items based on role
  const filterItems = useMemo(() => {
    return (items: MenuItemWithRoles[]) => {
      return items.filter(item => {
        // If staff is logged in
        if (isStaffLoggedIn && staffRole) {
          // If item has no allowedRoles, it's admin-only (Supabase Auth)
          if (!item.allowedRoles) return false;
          
          // Check if current role is allowed
          if (!item.allowedRoles.includes(staffRole)) return false;
          
          return true;
        } else {
          // Admin via Supabase Auth - hide staff-only items
          if (item.staffOnly) return false;
          return true;
        }
      });
    };
  }, [isStaffLoggedIn, staffRole]);

  // Filtered items
  const filteredQuickAccess = useMemo(() => filterItems(quickAccessItems), [filterItems]);
  const filteredOperational = useMemo(() => filterItems(operationalItems), [filterItems]);
  const filteredManagement = useMemo(() => filterItems(managementItems), [filterItems]);
  const showMenuManager = useMemo(() => !isStaffLoggedIn || staffRole === 'admin', [isStaffLoggedIn, staffRole]);
  const showStaffProfile = useMemo(() => isStaffLoggedIn && staffRole && ['caixa', 'garcom'].includes(staffRole), [isStaffLoggedIn, staffRole]);

  // Update open state when route changes
  useEffect(() => {
    if (isMenuManagerActive) {
      setMenuManagerOpen(true);
    }
  }, [isMenuManagerActive]);

  // Fetch store slug when profile is available
  useEffect(() => {
    const fetchStoreSlug = async () => {
      if (!profile?.store_id) return;
      const { data } = await supabase
        .from("stores")
        .select("slug")
        .eq("id", profile.store_id)
        .maybeSingle();
      if (data?.slug) setStoreSlug(data.slug);
    };
    fetchStoreSlug();
  }, [profile?.store_id]);

  const handleSignOut = async () => {
    if (isStaffLoggedIn) {
      staffLogout();
    } else {
      await signOut();
      navigate('/');
    }
  };

  // macOS-style menu item component with blue selection indicator and yellow buttons
  const MenuItem = ({ item, isActive, end = false }: { 
    item: MenuItemWithRoles; 
    isActive?: boolean;
    end?: boolean;
  }) => {
    const Icon = item.icon;
    const active = isActive ?? location.pathname === item.url;
    
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={end}
            className={cn(
              "group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
              // Yellow button style
              "bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950",
              "hover:from-amber-500 hover:to-amber-600 hover:shadow-md hover:shadow-amber-500/25",
              "shadow-sm shadow-amber-600/20",
              "border border-amber-500/30"
            )}
            activeClassName="!from-amber-500 !to-amber-600 !shadow-lg !shadow-amber-500/30"
          >
            {/* Blue selection indicator - left bar */}
            {active && (
              <motion.span 
                layoutId="sidebar-indicator"
                className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-500/50"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon className="w-4 h-4 flex-shrink-0 text-amber-900" />
            {!collapsed && <span className="text-amber-900">{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-r border-white/20",
        // Apple frosted glass effect - gray translucent background
        "!bg-[hsl(220,8%,85%,0.92)] dark:!bg-[hsl(220,12%,18%,0.95)]",
        "backdrop-blur-xl backdrop-saturate-[1.8]",
        "shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.2),inset_1px_0_0_0_rgba(255,255,255,0.08)]"
      )}
    >
      <SidebarContent className="bg-transparent">
        {/* Header - Store info */}
        <div className="px-3 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br from-amber-400 to-amber-600",
              "shadow-md shadow-amber-500/30"
            )}>
              <Pizza className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <h2 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-tight">
                  {isStaffLoggedIn ? staffName : "Pizzaria"}
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  {isStaffLoggedIn ? (staffRole === 'garcom' ? 'Garçom' : 'Admin') : "Portuguesa"}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Quick Access - only if has items */}
        {filteredQuickAccess.length > 0 && (
          <SidebarGroup className="py-3">
            <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Acesso Rápido
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2.5 mt-1">
              <SidebarMenu className="gap-2">
                {filteredQuickAccess.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Operational - only if has items */}
        {filteredOperational.length > 0 && (
          <SidebarGroup className="py-3">
            <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Operacional
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2.5 mt-1">
              <SidebarMenu className="gap-2">
                {filteredOperational.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management - only if has items or is admin */}
        {(filteredManagement.length > 0 || showMenuManager) && (
          <SidebarGroup className="py-3 flex-1">
            <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Gestão
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2.5 mt-1">
              <SidebarMenu className="gap-2">
                {/* Dashboard and Pedidos */}
                {filteredManagement.slice(0, 2).map((item) => (
                  <MenuItem key={item.title} item={item} end={item.url === "/dashboard"} />
                ))}

                {/* Menu Manager - Collapsible - only for admin */}
                {showMenuManager && (
                  <SidebarMenuItem>
                    <Collapsible open={menuManagerOpen} onOpenChange={setMenuManagerOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                            // Yellow button style
                            "bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950",
                            "hover:from-amber-500 hover:to-amber-600 hover:shadow-md hover:shadow-amber-500/25",
                            "shadow-sm shadow-amber-600/20",
                            "border border-amber-500/30"
                          )}
                        >
                          {/* Blue selection indicator */}
                          {isMenuManagerActive && (
                            <motion.span 
                              layoutId="sidebar-indicator-menu"
                              className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-500/50"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            />
                          )}
                          <Menu className="w-4 h-4 flex-shrink-0 text-amber-900" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left text-amber-900">Cardápio</span>
                              <ChevronRight 
                                className={cn(
                                  "w-3.5 h-3.5 transition-transform duration-200 text-amber-800",
                                  menuManagerOpen && "rotate-90"
                                )} 
                              />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <AnimatePresence>
                        {menuManagerOpen && (
                          <CollapsibleContent forceMount asChild>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className={cn("ml-4 pl-3 border-l-2 border-amber-400/40 mt-2 space-y-1.5", collapsed && "hidden")}>
                                {menuManagerSubItems.map((subItem) => {
                                  const Icon = subItem.icon;
                                  const isSubActive = location.pathname.startsWith(subItem.url);
                                  return (
                                    <NavLink
                                      key={subItem.url}
                                      to={subItem.url}
                                      className={cn(
                                        "relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200",
                                        // Yellow sub-button style
                                        "bg-gradient-to-b from-amber-300/90 to-amber-400/90 text-amber-900",
                                        "hover:from-amber-400 hover:to-amber-500 hover:shadow-sm",
                                        "border border-amber-400/30"
                                      )}
                                      activeClassName="!from-amber-400 !to-amber-500 !shadow-md"
                                    >
                                      {isSubActive && (
                                        <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-md shadow-blue-500/40" />
                                      )}
                                      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-amber-800" />
                                      <span className="text-amber-900">{subItem.title}</span>
                                    </NavLink>
                                  );
                                })}
                              </div>
                            </motion.div>
                          </CollapsibleContent>
                        )}
                      </AnimatePresence>
                    </Collapsible>
                  </SidebarMenuItem>
                )}

                {/* Rest of management items */}
                {filteredManagement.slice(2).map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}

                {/* Staff Profile - only for staff */}
                {showStaffProfile && (
                  <MenuItem item={staffProfileItem} />
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3 bg-transparent">
        <div className="space-y-2">
          {storeSlug && !isStaffLoggedIn && (
            <button
              onClick={() => window.open(`/cardapio/${storeSlug}`, '_blank')}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                // Yellow button style for footer
                "bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950",
                "hover:from-amber-500 hover:to-amber-600 hover:shadow-md hover:shadow-amber-500/25",
                "shadow-sm shadow-amber-600/20",
                "border border-amber-500/30"
              )}
            >
              <ExternalLink className="w-4 h-4 text-amber-900" />
              {!collapsed && <span className="text-amber-900">Ver Cardápio</span>}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
              "bg-gradient-to-b from-red-500/20 to-red-600/20 text-red-600 dark:text-red-400",
              "hover:from-red-500/30 hover:to-red-600/30",
              "border border-red-500/20"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
        
        {/* User info */}
        {!collapsed && (
          <div className="mt-3 pt-3 border-t border-sidebar-border/40 px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-[10px] font-medium text-white uppercase">
                  {isStaffLoggedIn ? staffName?.charAt(0) : user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <p className="text-[11px] text-sidebar-foreground-muted truncate flex-1">
                {isStaffLoggedIn ? staffName : user?.email}
              </p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
