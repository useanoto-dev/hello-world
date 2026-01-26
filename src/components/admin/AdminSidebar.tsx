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
  { title: "Meus Pedidos", url: "/dashboard/waiter-orders", icon: Receipt, allowedRoles: ['garcom'], staffOnly: true },
];

// Submenu do Gestor de Cardápio - only admin
const menuManagerSubItems: MenuItemWithRoles[] = [
  { title: "Gestor", url: "/dashboard/products", icon: Menu },
  { title: "Sabores de Pizza", url: "/dashboard/pizza-flavors", icon: Pizza },
  { title: "Fluxos", url: "/dashboard/flows", icon: GitBranch },
  { title: "Imagens", url: "/dashboard/menu-images", icon: Image },
  { title: "Edição em massa", url: "/dashboard/menu-bulk-edit", icon: Edit3 },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package },
  { title: "Banners", url: "/dashboard/banners", icon: ImageIcon },
  { title: "Cupons", url: "/dashboard/coupons", icon: Ticket },
];

// Management items
const managementItems: MenuItemWithRoles[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pedidos", url: "/dashboard/orders", icon: ClipboardList, allowedRoles: ['admin'] },
  { title: "Clientes", url: "/dashboard/customers", icon: Users },
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
    location.pathname.startsWith("/dashboard/flows") ||
    location.pathname.startsWith("/dashboard/inventory") ||
    location.pathname.startsWith("/dashboard/banners") ||
    location.pathname.startsWith("/dashboard/coupons");
  
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

  // Clean minimalist menu item - white bg with yellow accent on active
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
              "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
              "text-gray-600 hover:text-gray-900",
              "hover:bg-gray-100/80",
              active && "!bg-amber-50 !text-amber-900"
            )}
            activeClassName="!bg-amber-50 !text-amber-900"
          >
            {/* Yellow left indicator for active */}
            <AnimatePresence>
              {active && (
                <motion.span 
                  layoutId="sidebar-active-indicator"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-500 rounded-r-full"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
            </AnimatePresence>
            <Icon className={cn(
              "w-[18px] h-[18px] flex-shrink-0 transition-colors",
              active ? "text-amber-600" : "text-gray-400 group-hover:text-gray-600"
            )} />
            {!collapsed && (
              <span className="truncate">{item.title}</span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-r border-gray-200/80",
        "!bg-white"
      )}
    >
      <SidebarContent className="bg-transparent">
        {/* Header - Clean branding */}
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br from-amber-400 to-amber-500",
              "shadow-lg shadow-amber-500/25"
            )}>
              <Pizza className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <h2 className="font-semibold text-[15px] text-gray-900 leading-tight truncate">
                  {isStaffLoggedIn ? staffName : "Anotô"}
                </h2>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {isStaffLoggedIn ? (staffRole === 'garcom' ? 'Garçom' : 'Admin') : "Sistema de Delivery"}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Quick Access - only if has items */}
        {filteredQuickAccess.length > 0 && (
          <SidebarGroup className="py-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Acesso Rápido
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="gap-0.5">
                {filteredQuickAccess.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Operational - only if has items */}
        {filteredOperational.length > 0 && (
          <SidebarGroup className="py-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Operacional
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="gap-0.5">
                {filteredOperational.map((item) => (
                  <MenuItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management - only if has items or is admin */}
        {(filteredManagement.length > 0 || showMenuManager) && (
          <SidebarGroup className="py-2 flex-1">
            {!collapsed && (
              <SidebarGroupLabel className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Gestão
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="gap-0.5">
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
                            "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                            "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80",
                            isMenuManagerActive && "bg-amber-50 text-amber-900"
                          )}
                        >
                          {/* Yellow left indicator */}
                          {isMenuManagerActive && (
                            <motion.span 
                              layoutId="sidebar-menu-indicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-500 rounded-r-full"
                              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                            />
                          )}
                          <Menu className={cn(
                            "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                            isMenuManagerActive ? "text-amber-600" : "text-gray-400 group-hover:text-gray-600"
                          )} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left truncate">Cardápio</span>
                              <ChevronRight 
                                className={cn(
                                  "w-4 h-4 text-gray-400 transition-transform duration-200",
                                  menuManagerOpen && "rotate-90"
                                )} 
                              />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <AnimatePresence>
                        {menuManagerOpen && !collapsed && (
                          <CollapsibleContent forceMount asChild>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="ml-5 pl-3 border-l border-gray-200 mt-1 space-y-0.5">
                                {menuManagerSubItems.map((subItem) => {
                                  const Icon = subItem.icon;
                                  const isSubActive = location.pathname.startsWith(subItem.url);
                                  return (
                                    <NavLink
                                      key={subItem.url}
                                      to={subItem.url}
                                      className={cn(
                                        "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-medium transition-all duration-150",
                                        "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60",
                                        isSubActive && "!bg-amber-50/80 !text-amber-800"
                                      )}
                                      activeClassName="!bg-amber-50/80 !text-amber-800"
                                    >
                                      <Icon className={cn(
                                        "w-4 h-4 flex-shrink-0 transition-colors",
                                        isSubActive ? "text-amber-500" : "text-gray-400 group-hover:text-gray-500"
                                      )} />
                                      <span className="truncate">{subItem.title}</span>
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

      <SidebarFooter className="border-t border-gray-100 p-3 bg-gray-50/50">
        <div className="space-y-1.5">
          {storeSlug && !isStaffLoggedIn && (
            <button
              onClick={() => window.open(`/cardapio/${storeSlug}`, '_blank')}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150",
                "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              )}
            >
              <ExternalLink className="w-4 h-4" />
              {!collapsed && <span>Ver Cardápio</span>}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150",
              "text-gray-500 hover:text-red-600 hover:bg-red-50"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
        
        {/* User info */}
        {!collapsed && (
          <div className="mt-3 pt-3 border-t border-gray-100 px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
                <span className="text-[11px] font-semibold text-white uppercase">
                  {isStaffLoggedIn ? staffName?.charAt(0) : user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate flex-1">
                {isStaffLoggedIn ? staffName : user?.email}
              </p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
