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
  ChevronDown,
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

// Grupos de menu organizados por função
const quickAccessItems = [
  { title: "PDV", url: "/dashboard/pdv", icon: CreditCard, description: "Ponto de venda" },
];

const operationalItems = [
  { title: "Mesas", url: "/dashboard/tables", icon: UtensilsCrossed, description: "Gerenciar mesas e pedidos PDV" },
  { title: "Cozinha", url: "/dashboard/comandas", icon: ChefHat, description: "Controle de pedidos da cozinha" },
];

// Submenu do Gestor de Cardápio
const menuManagerSubItems = [
  { title: "Gestor", url: "/dashboard/products", icon: Menu },
  { title: "Sabores de Pizza", url: "/dashboard/pizza-flavors", icon: Pizza },
  { title: "Fluxos", url: "/dashboard/flows", icon: GitBranch },
  { title: "Imagens do cardápio", url: "/dashboard/menu-images", icon: Image },
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
  { title: "Mensagens WhatsApp", url: "/dashboard/whatsapp-messages", icon: MessageSquare },
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

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-[hsl(var(--sidebar-border))]"
    >
      <SidebarContent className="bg-[hsl(var(--sidebar-bg))]">
        {/* Logo */}
        <div className="p-4 border-b border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Pizza className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className={`font-bold text-sm ${isDark ? 'text-foreground' : 'text-gray-900'}`}>Pizzaria</h2>
                <p className={`text-xs ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>Portuguesa</p>
              </div>
            )}
          </div>
        </div>

        {/* Acesso Rápido - PDV */}
        <SidebarGroup>
          <SidebarGroupLabel className={isDark ? 'text-muted-foreground' : 'text-gray-500'}>
            Acesso Rápido
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickAccessItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isDark 
                          ? 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground' 
                          : 'text-gray-600 hover:bg-[hsl(var(--sidebar-hover))] hover:text-gray-900'
                      }`}
                      activeClassName="bg-[hsl(var(--sidebar-active))] text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operacional */}
        <SidebarGroup>
          <SidebarGroupLabel className={isDark ? 'text-muted-foreground' : 'text-gray-500'}>
            Operacional
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isDark 
                          ? 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground' 
                          : 'text-gray-600 hover:bg-[hsl(var(--sidebar-hover))] hover:text-gray-900'
                      }`}
                      activeClassName="bg-[hsl(var(--sidebar-active))] text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gestão */}
        <SidebarGroup>
          <SidebarGroupLabel className={isDark ? 'text-muted-foreground' : 'text-gray-500'}>
            Gestão
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard and Pedidos */}
              {managementItems.slice(0, 2).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isDark 
                          ? 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground' 
                          : 'text-gray-600 hover:bg-[hsl(var(--sidebar-hover))] hover:text-gray-900'
                      }`}
                      activeClassName="bg-[hsl(var(--sidebar-active))] text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Gestor de Cardápio - Collapsible */}
              <SidebarMenuItem>
                <Collapsible open={menuManagerOpen} onOpenChange={setMenuManagerOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
                        isMenuManagerActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : isDark 
                            ? 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground' 
                            : 'text-gray-600 hover:bg-[hsl(var(--sidebar-hover))] hover:text-gray-900'
                      )}
                    >
                      <Menu className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Gestor de cardápio</span>
                          <ChevronDown 
                            className={cn(
                              "w-4 h-4 transition-transform duration-200",
                              menuManagerOpen && "rotate-180"
                            )} 
                          />
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className={cn("ml-4 pl-4 border-l border-[hsl(var(--sidebar-border))] mt-1", collapsed && "hidden")}>
                      {menuManagerSubItems.map((subItem) => (
                        <NavLink
                          key={subItem.url}
                          to={subItem.url}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            isDark 
                              ? 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground' 
                              : 'text-gray-600 hover:bg-[hsl(var(--sidebar-hover))] hover:text-gray-900'
                          )}
                          activeClassName="bg-[hsl(var(--sidebar-active))] text-primary font-semibold"
                        >
                          <subItem.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{subItem.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {/* Rest of management items */}
              {managementItems.slice(2).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isDark 
                          ? 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground' 
                          : 'text-gray-600 hover:bg-[hsl(var(--sidebar-hover))] hover:text-gray-900'
                      }`}
                      activeClassName="bg-[hsl(var(--sidebar-active))] text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[hsl(var(--sidebar-border))] p-4 bg-[hsl(var(--sidebar-bg))]">
        <div className="space-y-2">
          {storeSlug && (
            <button
              onClick={() => window.open(`/cardapio/${storeSlug}`, '_blank')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                isDark 
                  ? 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground' 
                  : 'text-gray-600 hover:bg-[hsl(var(--sidebar-hover))] hover:text-gray-900'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              {!collapsed && <span>Ver Cardápio</span>}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
        {!collapsed && user && (
          <div className={`mt-4 pt-4 border-t border-[hsl(var(--sidebar-border))]`}>
            <p className={`text-xs truncate ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>{user.email}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
