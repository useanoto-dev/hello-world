import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

// Grupos de menu organizados por função
const quickAccessItems = [
  { title: "PDV", url: "/dashboard/pdv", icon: CreditCard },
];

const operationalItems = [
  { title: "Mesas", url: "/dashboard/tables", icon: UtensilsCrossed },
  { title: "Cozinha", url: "/dashboard/comandas", icon: ChefHat },
];

// Submenu do Gestor de Cardápio
const menuManagerSubItems = [
  { title: "Gestor", url: "/dashboard/products", icon: Menu },
  { title: "Sabores de Pizza", url: "/dashboard/pizza-flavors", icon: Pizza },
  { title: "Fluxos", url: "/dashboard/flows", icon: GitBranch },
  { title: "Imagens", url: "/dashboard/menu-images", icon: Image },
  { title: "Edição em massa", url: "/dashboard/menu-bulk-edit", icon: Edit3 },
];

const managementItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pedidos", url: "/dashboard/orders", icon: ClipboardList },
  { title: "Banners", url: "/dashboard/banners", icon: ImageIcon },
  { title: "Clientes", url: "/dashboard/customers", icon: Users },
  { title: "Cupons", url: "/dashboard/coupons", icon: Ticket },
  { title: "Relatórios", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Integrações", url: "/dashboard/integrations", icon: Plug },
  { title: "WhatsApp", url: "/dashboard/whatsapp-messages", icon: MessageSquare },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

interface AdminSidebarProps {
  isDark?: boolean;
}

export default function AdminSidebar({ isDark = false }: AdminSidebarProps) {
  const { signOut, user, profile } = useAuth();
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
    await signOut();
    navigate('/');
  };

  // macOS-style menu item component with blue selection indicator
  const MenuItem = ({ item, isActive, end = false }: { 
    item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }; 
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
              "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
              "bg-[hsl(var(--sidebar-button-bg))] text-sidebar-foreground",
              "hover:bg-[hsl(var(--sidebar-button-hover))] hover:shadow-sm",
              "shadow-sm"
            )}
            activeClassName="!bg-[hsl(var(--sidebar-active))] text-white shadow-md"
          >
            {/* Blue selection indicator */}
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[hsl(210,100%,50%)] rounded-r-full" />
            )}
            <Icon className={cn(
              "w-4 h-4 flex-shrink-0 transition-colors",
              active ? "text-white" : "text-sidebar-foreground"
            )} />
            {!collapsed && <span className={active ? "text-white" : ""}>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-r border-sidebar-border/60",
        // Apple frosted glass effect
        "bg-gradient-to-b from-[hsl(var(--sidebar-bg))] to-[hsl(var(--sidebar-bg-end))]",
        "backdrop-blur-2xl backdrop-saturate-150",
        "shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.1)]"
      )}
    >
      <SidebarContent className="bg-transparent">
        {/* Header - Store info */}
        <div className="px-3 py-4 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br from-amber-400 to-orange-500",
              "shadow-sm shadow-amber-500/20"
            )}>
              <Pizza className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <h2 className="font-semibold text-sm text-sidebar-foreground leading-tight">Pizzaria</h2>
                <p className="text-[11px] text-sidebar-foreground-muted leading-tight">Portuguesa</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground-muted/60">
            Acesso Rápido
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2.5">
            <SidebarMenu className="gap-1.5">
              {quickAccessItems.map((item) => (
                <MenuItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operational */}
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground-muted/60">
            Operacional
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2.5">
            <SidebarMenu className="gap-1.5">
              {operationalItems.map((item) => (
                <MenuItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup className="py-2 flex-1">
          <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground-muted/60">
            Gestão
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2.5">
            <SidebarMenu className="gap-1.5">
              {/* Dashboard and Pedidos */}
              {managementItems.slice(0, 2).map((item) => (
                <MenuItem key={item.title} item={item} end={item.url === "/dashboard"} />
              ))}

              {/* Menu Manager - Collapsible */}
              <SidebarMenuItem>
                <Collapsible open={menuManagerOpen} onOpenChange={setMenuManagerOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                        "bg-[hsl(var(--sidebar-button-bg))] text-sidebar-foreground shadow-sm",
                        "hover:bg-[hsl(var(--sidebar-button-hover))] hover:shadow-sm",
                        isMenuManagerActive && "!bg-[hsl(var(--sidebar-active))] text-white shadow-md"
                      )}
                    >
                      {/* Blue selection indicator */}
                      {isMenuManagerActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[hsl(210,100%,50%)] rounded-r-full" />
                      )}
                      <Menu className={cn("w-4 h-4 flex-shrink-0", isMenuManagerActive && "text-white")} />
                      {!collapsed && (
                        <>
                          <span className={cn("flex-1 text-left", isMenuManagerActive && "text-white")}>Cardápio</span>
                          <ChevronRight 
                            className={cn(
                              "w-3.5 h-3.5 transition-transform duration-200",
                              isMenuManagerActive ? "text-white/70" : "text-sidebar-foreground/60",
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
                          <div className={cn("ml-4 pl-3 border-l-2 border-[hsl(var(--sidebar-border))] mt-1 space-y-1", collapsed && "hidden")}>
                            {menuManagerSubItems.map((subItem) => {
                              const Icon = subItem.icon;
                              const isSubActive = location.pathname.startsWith(subItem.url);
                              return (
                                <NavLink
                                  key={subItem.url}
                                  to={subItem.url}
                                  className={cn(
                                    "relative flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150",
                                    "bg-[hsl(var(--sidebar-button-bg))]/80 text-sidebar-foreground",
                                    "hover:bg-[hsl(var(--sidebar-button-hover))]"
                                  )}
                                  activeClassName="!bg-[hsl(var(--sidebar-active))] text-white"
                                >
                                  {isSubActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[hsl(210,100%,50%)] rounded-r-full" />
                                  )}
                                  <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isSubActive && "text-white")} />
                                  <span className={isSubActive ? "text-white" : ""}>{subItem.title}</span>
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

              {/* Rest of management items */}
              {managementItems.slice(2).map((item) => (
                <MenuItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 p-3 bg-transparent">
        <div className="space-y-1.5">
          {storeSlug && (
            <button
              onClick={() => window.open(`/cardapio/${storeSlug}`, '_blank')}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                "bg-[hsl(var(--sidebar-button-bg))] text-sidebar-foreground shadow-sm",
                "hover:bg-[hsl(var(--sidebar-button-hover))]"
              )}
            >
              <ExternalLink className="w-4 h-4" />
              {!collapsed && <span>Ver Cardápio</span>}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
              "bg-red-500/10 text-red-600 dark:text-red-400",
              "hover:bg-red-500/20"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
        
        {/* User info */}
        {!collapsed && user && (
          <div className="mt-3 pt-3 border-t border-sidebar-border/40 px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-[10px] font-medium text-white uppercase">
                  {user.email?.charAt(0) || 'U'}
                </span>
              </div>
              <p className="text-[11px] text-sidebar-foreground-muted truncate flex-1">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
