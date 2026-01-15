import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { X, ExternalLink, LogOut, Sun, Moon, UserCircle, ClipboardList } from "lucide-react";
import {
  LayoutDashboard, Monitor, UtensilsCrossed, ChefHat, ShoppingBag,
  TrendingUp, Users, Package, Warehouse, TicketPercent, Image, Plug,
  Settings, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useStaffAuth, type StaffRole } from "@/hooks/useStaffAuth";

interface MobileMoreDrawerProps {
  open: boolean;
  onClose: () => void;
  store: {
    name: string;
    slug: string;
    logo_url?: string | null;
    use_comanda_mode?: boolean;
  } | null;
  onLogout: () => void;
}

interface MenuItemConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  requiresComandaMode?: boolean;
  allowedRoles?: StaffRole[];
  staffOnly?: boolean;
}

const allMenuItems: MenuItemConfig[] = [
  { icon: LayoutDashboard, label: "Início", path: "/dashboard", allowedRoles: ['admin'] },
  { icon: Monitor, label: "PDV", path: "/dashboard/pdv", allowedRoles: ['admin', 'caixa'] },
  { icon: UtensilsCrossed, label: "Mesas", path: "/dashboard/tables", allowedRoles: ['admin', 'caixa', 'garcom'] },
  { icon: ChefHat, label: "Cozinha", path: "/dashboard/comandas", requiresComandaMode: true, allowedRoles: ['admin', 'caixa'] },
  { icon: ClipboardList, label: "Meus Pedidos", path: "/dashboard/my-orders", allowedRoles: ['garcom'], staffOnly: true },
  { icon: ShoppingBag, label: "Pedidos", path: "/dashboard/orders", allowedRoles: ['admin', 'caixa'] },
  { icon: TrendingUp, label: "Analytics", path: "/dashboard/analytics", allowedRoles: ['admin', 'caixa'] },
  { icon: Users, label: "Clientes", path: "/dashboard/customers", allowedRoles: ['admin'] },
  { icon: Package, label: "Gestor de Cardápio", path: "/dashboard/products", allowedRoles: ['admin'] },
  { icon: Warehouse, label: "Estoque", path: "/dashboard/inventory", allowedRoles: ['admin'] },
  { icon: TicketPercent, label: "Cupons", path: "/dashboard/coupons", allowedRoles: ['admin'] },
  { icon: Image, label: "Banners", path: "/dashboard/banners", allowedRoles: ['admin'] },
  { icon: Plug, label: "Integrações", path: "/dashboard/integrations", allowedRoles: ['admin'] },
  { icon: Settings, label: "Configurações", path: "/dashboard/settings", allowedRoles: ['admin'] },
  { icon: CreditCard, label: "Assinatura", path: "/dashboard/subscription", allowedRoles: ['admin'] },
  { icon: UserCircle, label: "Meu Perfil", path: "/dashboard/profile", allowedRoles: ['caixa', 'garcom'], staffOnly: true },
];

export function MobileMoreDrawer({ open, onClose, store, onLogout }: MobileMoreDrawerProps) {
  const { theme, setTheme } = useTheme();
  const { isStaffLoggedIn, role, name, logout } = useStaffAuth();
  
  // Filter menu items based on comanda mode and role
  const menuItems = allMenuItems.filter(item => {
    // Filter by comanda mode
    if (item.requiresComandaMode && store?.use_comanda_mode === false) {
      return false;
    }
    
    // If staff is logged in, filter by role
    if (isStaffLoggedIn && role) {
      // Items with allowedRoles must include the staff role
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
  });

  const handleLogout = () => {
    onClose();
    if (isStaffLoggedIn) {
      logout();
    } else {
      onLogout();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#FEDE01] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-900/30" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-[#e5c801]">
          <div className="flex items-center gap-3">
            {isStaffLoggedIn ? (
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                <span className="text-[#FEDE01] font-bold text-lg uppercase">
                  {name?.charAt(0) || "F"}
                </span>
              </div>
            ) : store?.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.name} 
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                <span className="text-[#FEDE01] font-bold text-lg">
                  {store?.name?.charAt(0) || "A"}
                </span>
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-900">
                {isStaffLoggedIn ? name : (store?.name || "Minha Loja")}
              </h2>
              <p className="text-xs text-gray-700">
                {isStaffLoggedIn ? `Logado como ${role}` : "Painel de Controle"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {store?.slug && !isStaffLoggedIn && (
              <a
                href={`/cardapio/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-[#e5c801] transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-gray-900" />
              </a>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#e5c801] transition-colors"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-3">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-colors"
              >
                <item.icon className="w-6 h-6 text-gray-900" />
                <span className="text-[11px] font-medium text-gray-900 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#e5c801] px-4 py-3 flex items-center justify-between">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e5c801] transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-gray-900" />
            ) : (
              <Moon className="w-4 h-4 text-gray-900" />
            )}
          </button>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#e5c801] transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-900" />
          </button>
        </div>
      </motion.div>
    </>
  );
}
