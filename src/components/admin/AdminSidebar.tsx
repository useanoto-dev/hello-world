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
  ChevronDown,
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
  Store,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStaffAuth, type StaffRole } from "@/hooks/useStaffAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import logoHeader from "@/assets/anoto-logo-header.avif";

// Menu item with role permissions
interface MenuItemWithRoles {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: StaffRole[];
  staffOnly?: boolean;
  badge?: number;
}

// All menu items organized by section
const mainMenuItems: MenuItemWithRoles[] = [
  { title: "Início", url: "/dashboard", icon: LayoutDashboard },
  { title: "PDV", url: "/dashboard/pdv", icon: CreditCard, allowedRoles: ['admin'] },
  { title: "Cozinha", url: "/dashboard/comandas", icon: ChefHat, allowedRoles: ['admin'] },
  { title: "Pedidos", url: "/dashboard/orders", icon: ClipboardList, allowedRoles: ['admin'] },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3, allowedRoles: ['admin'] },
  { title: "Financeiro", url: "/dashboard/financeiro", icon: DollarSign },
  { title: "Clientes", url: "/dashboard/customers", icon: Users },
];

// Gestor de Cardápio submenu
const menuManagerSubItems: MenuItemWithRoles[] = [
  { title: "Produtos", url: "/dashboard/products", icon: Package },
  { title: "Modais", url: "/dashboard/upsell-modals", icon: ImageIcon },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package },
  { title: "Cupons", url: "/dashboard/coupons", icon: Ticket },
  { title: "Banners", url: "/dashboard/banners", icon: ImageIcon },
];

// Bottom menu items
const bottomMenuItems: MenuItemWithRoles[] = [
  { title: "Integrações", url: "/dashboard/integrations", icon: Plug },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

// Staff items
const staffItems: MenuItemWithRoles[] = [
  { title: "Mesas", url: "/dashboard/tables", icon: UtensilsCrossed, allowedRoles: ['admin', 'garcom'] },
  { title: "Meus Pedidos", url: "/dashboard/waiter-orders", icon: Receipt, allowedRoles: ['garcom'], staffOnly: true },
];

interface AdminSidebarProps {
  isDark?: boolean;
}

export default function AdminSidebar({ isDark = false }: AdminSidebarProps) {
  const { signOut, user, profile } = useAuth();
  const { isStaffLoggedIn, role: staffRole, name: staffName, logout: staffLogout } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("Anotô");
  
  // Check if current route is within menu manager section
  const isMenuManagerActive = location.pathname.startsWith("/dashboard/products") ||
    location.pathname.startsWith("/dashboard/upsell") ||
    location.pathname.startsWith("/dashboard/inventory") ||
    location.pathname.startsWith("/dashboard/banners") ||
    location.pathname.startsWith("/dashboard/coupons");
  
  const [menuManagerOpen, setMenuManagerOpen] = useState(isMenuManagerActive);

  // Filter menu items based on role
  const filterItems = useMemo(() => {
    return (items: MenuItemWithRoles[]) => {
      return items.filter(item => {
        if (isStaffLoggedIn && staffRole) {
          if (!item.allowedRoles) return false;
          if (!item.allowedRoles.includes(staffRole)) return false;
          return true;
        } else {
          if (item.staffOnly) return false;
          return true;
        }
      });
    };
  }, [isStaffLoggedIn, staffRole]);

  const filteredMainMenu = useMemo(() => filterItems(mainMenuItems), [filterItems]);
  const filteredStaffItems = useMemo(() => filterItems(staffItems), [filterItems]);
  const showMenuManager = useMemo(() => !isStaffLoggedIn || staffRole === 'admin', [isStaffLoggedIn, staffRole]);

  useEffect(() => {
    if (isMenuManagerActive) {
      setMenuManagerOpen(true);
    }
  }, [isMenuManagerActive]);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!profile?.store_id) return;
      const { data } = await supabase
        .from("stores")
        .select("slug, name")
        .eq("id", profile.store_id)
        .maybeSingle();
      if (data?.slug) setStoreSlug(data.slug);
      if (data?.name) setStoreName(data.name);
    };
    fetchStoreData();
  }, [profile?.store_id]);

  const handleSignOut = async () => {
    if (isStaffLoggedIn) {
      staffLogout();
    } else {
      await signOut();
      navigate('/');
    }
  };

  // Menu item component
  const MenuItem = ({ item, end = false }: { item: MenuItemWithRoles; end?: boolean }) => {
    const Icon = item.icon;
    const isActive = end 
      ? location.pathname === item.url 
      : location.pathname.startsWith(item.url);
    
    const content = (
      <NavLink
        to={item.url}
        end={end}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
          isActive && "!bg-amber-500 !text-white shadow-lg shadow-amber-500/25"
        )}
        activeClassName="!bg-amber-500 !text-white shadow-lg shadow-amber-500/25"
      >
        <Icon className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
        )} />
        {!collapsed && (
          <span className="truncate">{item.title}</span>
        )}
        {item.badge && !collapsed && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <SidebarMenuItem>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild>{content}</SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>{content}</SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-r border-slate-200/60",
        "!bg-gradient-to-b !from-slate-50 !to-white"
      )}
    >
      <SidebarContent className="bg-transparent flex flex-col">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-4 border-b border-slate-100",
          collapsed && "justify-center px-2"
        )}>
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 flex-1"
            >
              <img 
                src={logoHeader} 
                alt="Anotô" 
                className="h-8 w-auto"
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm text-slate-900 truncate">
                  {storeName}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Sistema de Delivery
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Store Status Badge */}
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-700">Loja Aberta</span>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup className="flex-1 py-2">
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="gap-1">
              {/* Main items */}
              {filteredMainMenu.map((item) => (
                <MenuItem key={item.url} item={item} end={item.url === "/dashboard"} />
              ))}

              {/* Gestor de Cardápio - Collapsible */}
              {showMenuManager && (
                <SidebarMenuItem>
                  <Collapsible open={menuManagerOpen} onOpenChange={setMenuManagerOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                          "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                          isMenuManagerActive && "bg-amber-50 text-amber-700"
                        )}
                      >
                        <Menu className={cn(
                          "w-5 h-5 flex-shrink-0 transition-colors",
                          isMenuManagerActive ? "text-amber-600" : "text-slate-400 group-hover:text-slate-600"
                        )} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Gestor de Cardápio</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 text-slate-400 transition-transform duration-200",
                              menuManagerOpen && "rotate-180"
                            )} />
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
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-200 space-y-1">
                              {menuManagerSubItems.map((subItem) => {
                                const Icon = subItem.icon;
                                const isSubActive = location.pathname.startsWith(subItem.url);
                                return (
                                  <NavLink
                                    key={subItem.url}
                                    to={subItem.url}
                                    className={cn(
                                      "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                                      "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
                                      isSubActive && "!bg-amber-500 !text-white"
                                    )}
                                    activeClassName="!bg-amber-500 !text-white"
                                  >
                                    <Icon className={cn(
                                      "w-4 h-4 flex-shrink-0",
                                      isSubActive ? "text-white" : "text-slate-400 group-hover:text-slate-500"
                                    )} />
                                    <span>{subItem.title}</span>
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

              {/* Staff items */}
              {filteredStaffItems.map((item) => (
                <MenuItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Section */}
        <SidebarGroup className="py-2 border-t border-slate-100">
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="gap-1">
              {bottomMenuItems.map((item) => (
                <MenuItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-slate-100 p-3 bg-slate-50/50">
        {/* Quick Actions */}
        {!collapsed && storeSlug && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => window.open(`/cardapio/${storeSlug}`, '_blank')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Cardápio
            </button>
          </div>
        )}

        {/* User Info & Logout */}
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-100",
          collapsed && "justify-center p-2"
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-xs font-bold text-white uppercase">
              {isStaffLoggedIn ? staffName?.charAt(0) : user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">
                  {isStaffLoggedIn ? staffName : user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {isStaffLoggedIn ? (staffRole === 'garcom' ? 'Garçom' : 'Admin') : 'Administrador'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
            "text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          )}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span>Recolher menu</span>
            </>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
