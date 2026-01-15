import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Monitor, 
  MoreHorizontal,
  Package,
  UtensilsCrossed,
  ClipboardList,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useMemo } from "react";
import { useStaffAuth, type StaffRole } from "@/hooks/useStaffAuth";

interface DashboardBottomNavProps {
  isStoreOpen: boolean;
  pendingOrdersCount: number;
  onMoreClick: () => void;
}

interface NavItemConfig {
  path: string;
  icon: LucideIcon;
  label: string;
  showBadge?: boolean;
  allowedRoles: StaffRole[];
}

// All possible nav items with their allowed roles
const allNavItems: NavItemConfig[] = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Início", allowedRoles: ['admin'] },
  { path: "/dashboard/orders", icon: ShoppingBag, label: "Pedidos", showBadge: true, allowedRoles: ['admin'] },
  { path: "/dashboard/pdv", icon: Monitor, label: "PDV", allowedRoles: ['admin'] },
  { path: "/dashboard/waiter-pos", icon: ShoppingBag, label: "Fazer Pedido", allowedRoles: ['garcom'] },
  { path: "/dashboard/waiter-orders", icon: ClipboardList, label: "Meus Pedidos", allowedRoles: ['garcom'] },
  { path: "/dashboard/products", icon: Package, label: "Cardápio", allowedRoles: ['admin'] },
];

export function DashboardBottomNav({ 
  isStoreOpen, 
  pendingOrdersCount,
  onMoreClick
}: DashboardBottomNavProps) {
  const location = useLocation();
  const { isStaffLoggedIn, role } = useStaffAuth();
  
  // Filter nav items based on role
  const navItems = useMemo(() => {
    if (!isStaffLoggedIn || !role) {
      // Admin via Supabase Auth - show admin items
      return allNavItems.filter(item => item.allowedRoles.includes('admin')).slice(0, 4);
    }
    
    // Staff - filter by their role
    const filtered = allNavItems.filter(item => item.allowedRoles.includes(role));
    // Return max 4 items to keep layout balanced
    return filtered.slice(0, 4);
  }, [isStaffLoggedIn, role]);
  
  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FEDE01] border-t border-[#e5c801] rounded-t-3xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Store Status Indicator */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5",
            isStoreOpen 
              ? "bg-[#39FF14] text-gray-900" 
              : "bg-red-500 text-white"
          )}
        >
          <motion.div
            animate={isStoreOpen ? { 
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1]
            } : {}}
            transition={{ 
              duration: 1.5, 
              repeat: isStoreOpen ? Infinity : 0,
              ease: "easeInOut"
            }}
            className={cn(
              "w-2 h-2 rounded-full",
              isStoreOpen ? "bg-gray-900" : "bg-white/70"
            )}
          />
          {isStoreOpen ? "Aberta" : "Fechada"}
        </motion.div>
      </div>

      <div className="flex items-center justify-around pt-3 pb-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.showBadge && pendingOrdersCount > 0;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={triggerHaptic}
              className="relative flex flex-col items-center justify-center flex-1 h-12 gap-0.5 rounded-lg mx-0.5 hover:bg-[#e5c801] text-gray-900 transition-colors"
            >
              <div className="relative z-10">
                <Icon className={cn(
                  "h-5 w-5 transition-all",
                  isActive && "scale-110"
                )} />
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center bg-red-600 text-white text-[9px] font-bold rounded-full px-0.5"
                  >
                    {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                  </motion.span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium z-10",
                isActive && "font-bold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* More button */}
        <button
          onClick={() => {
            triggerHaptic();
            onMoreClick();
          }}
          className="relative flex flex-col items-center justify-center flex-1 h-12 gap-0.5 hover:bg-[#e5c801] text-gray-900 rounded-lg mx-0.5 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </div>
    </nav>
  );
}
