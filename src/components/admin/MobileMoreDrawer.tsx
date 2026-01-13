import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { X, ExternalLink, LogOut, Sun, Moon } from "lucide-react";
import {
  LayoutDashboard, Monitor, UtensilsCrossed, ChefHat, ShoppingBag,
  TrendingUp, Users, Package, Warehouse, TicketPercent, Image, Plug,
  Settings, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

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

const allMenuItems = [
  { icon: LayoutDashboard, label: "Início", path: "/dashboard" },
  { icon: Monitor, label: "PDV", path: "/dashboard/pdv" },
  { icon: UtensilsCrossed, label: "Mesas", path: "/dashboard/tables" },
  { icon: ChefHat, label: "Cozinha", path: "/dashboard/comandas", requiresComandaMode: true },
  { icon: ShoppingBag, label: "Pedidos", path: "/dashboard/orders" },
  { icon: TrendingUp, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Users, label: "Clientes", path: "/dashboard/customers" },
  { icon: Package, label: "Gestor de Cardápio", path: "/dashboard/products" },
  { icon: Warehouse, label: "Estoque", path: "/dashboard/inventory" },
  { icon: TicketPercent, label: "Cupons", path: "/dashboard/coupons" },
  { icon: Image, label: "Banners", path: "/dashboard/banners" },
  { icon: Plug, label: "Integrações", path: "/dashboard/integrations" },
  { icon: Settings, label: "Configurações", path: "/dashboard/settings" },
  { icon: CreditCard, label: "Assinatura", path: "/dashboard/subscription" },
];

export function MobileMoreDrawer({ open, onClose, store, onLogout }: MobileMoreDrawerProps) {
  const { theme, setTheme } = useTheme();
  
  // Filter menu items based on comanda mode
  const menuItems = allMenuItems.filter(item => {
    if (item.requiresComandaMode) {
      return store?.use_comanda_mode !== false;
    }
    return true;
  });

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-amber-400 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-amber-600/40" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-amber-500/50">
          <div className="flex items-center gap-3">
            {store?.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.name} 
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center shadow-sm">
                <span className="text-amber-600 font-bold text-lg">
                  {store?.name?.charAt(0) || "A"}
                </span>
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-900">{store?.name || "Minha Loja"}</h2>
              <p className="text-xs text-gray-700">Painel de Controle</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-amber-500/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-800" />
          </button>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-3">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-amber-500/50 transition-colors"
              >
                <item.icon className="w-6 h-6 text-gray-800" />
                <span className="text-[11px] font-medium text-gray-800 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-amber-500/50 px-4 py-3 flex items-center justify-between">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-500/50 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-gray-800" />
            ) : (
              <Moon className="w-4 h-4 text-gray-800" />
            )}
          </button>
          
          {/* View Menu Link */}
          {store?.slug && (
            <a
              href={`/cardapio/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-500/50 transition-colors text-gray-800"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-xs font-medium">Ver cardápio</span>
            </a>
          )}
          
          {/* Logout */}
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-600"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-medium">Sair</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
