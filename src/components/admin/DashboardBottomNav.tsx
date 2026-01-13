import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Monitor, 
  MoreHorizontal,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface DashboardBottomNavProps {
  isStoreOpen: boolean;
  pendingOrdersCount: number;
  onMoreClick: () => void;
}

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { path: "/dashboard/orders", icon: ShoppingBag, label: "Pedidos", showBadge: true },
  { path: "/dashboard/pdv", icon: Monitor, label: "PDV" },
  { path: "/dashboard/products", icon: Package, label: "Cardápio" },
];

export function DashboardBottomNav({ 
  isStoreOpen, 
  pendingOrdersCount,
  onMoreClick
}: DashboardBottomNavProps) {
  const location = useLocation();
  
  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#2B2E31] border-t border-[#3a3d41]"
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

      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.showBadge && pendingOrdersCount > 0;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={triggerHaptic}
              className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 rounded-lg mx-0.5 bg-amber-400 text-gray-900"
            >
              {/* Active indicator - removed, using bg color instead */}
              
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
          className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 bg-amber-400 text-gray-900 rounded-lg mx-0.5"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </div>
    </nav>
  );
}