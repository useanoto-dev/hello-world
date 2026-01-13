import { UtensilsCrossed, ClipboardList, Info, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type NavigationTab = "cardapio" | "pedidos" | "sobre";

interface BottomNavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  pendingOrdersCount?: number;
  cartItemsCount?: number;
  storeSlug?: string;
  hidden?: boolean;
  hideOrdersTab?: boolean;
}

const tabs: { id: NavigationTab; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: "cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "sobre", label: "Sobre", icon: Info },
];

export default function BottomNavigation({ 
  activeTab, 
  onTabChange, 
  pendingOrdersCount = 0,
  cartItemsCount = 0,
  storeSlug,
  hidden = false,
  hideOrdersTab = false
}: BottomNavigationProps) {
  // Filtra as tabs baseado no modo
  const visibleTabs = hideOrdersTab ? tabs.filter(t => t.id !== "pedidos") : tabs;
  const activeIndex = visibleTabs.findIndex(t => t.id === activeTab);
  
  if (hidden) return null;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Dot Indicators */}
      <div className="flex justify-center gap-1.5 pt-2">
        {visibleTabs.map((tab, index) => (
          <motion.div
            key={tab.id}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              index === activeIndex ? "bg-primary" : "bg-muted-foreground/30"
            )}
            animate={{ scale: index === activeIndex ? 1.2 : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        ))}
      </div>
      
      <div className="max-w-4xl mx-auto flex items-center justify-around h-14">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === "pedidos" && pendingOrdersCount > 0;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5]")} />
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full px-0.5"
                  >
                    {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                  </motion.span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium transition-all", isActive && "font-semibold")}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
        
        {/* Cart Button integrated */}
        {cartItemsCount > 0 && storeSlug && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-1"
            whileTap={{ scale: 0.95 }}
          >
            <Link
              to={`/cardapio/${storeSlug}/carrinho`}
              className="relative flex flex-col items-center justify-center h-full gap-0.5 text-primary"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <ShoppingCart className="h-5 w-5 text-primary-foreground" />
                </div>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1"
                >
                  {cartItemsCount > 99 ? "99+" : cartItemsCount}
                </motion.span>
              </div>
              <span className="text-[10px] font-semibold">Carrinho</span>
            </Link>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
