import { Home, FileText, Gift, ShoppingCart } from "lucide-react";
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

const tabs: { id: NavigationTab; label: string; icon: typeof Home }[] = [
  { id: "cardapio", label: "Início", icon: Home },
  { id: "pedidos", label: "Pedidos", icon: FileText },
  { id: "sobre", label: "Sobre", icon: Gift },
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
  
  if (hidden) return null;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Blue accent line at bottom - Desktop only */}
      <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-1 bg-[#3B5998]" />
      
      <div className="max-w-4xl mx-auto flex items-center justify-around h-14 lg:h-16">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === "pedidos" && pendingOrdersCount > 0;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 lg:gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5 lg:h-6 lg:w-6 transition-all",
                  isActive ? "stroke-[2]" : "stroke-[1.5]"
                )} />
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
              <span className={cn(
                "text-[10px] lg:text-xs transition-all",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
        
        {/* Cart Button */}
        <motion.div
          className="flex-1"
          whileTap={{ scale: 0.95 }}
        >
          {storeSlug ? (
            <Link
              to={`/cardapio/${storeSlug}/carrinho`}
              className={cn(
                "relative flex flex-col items-center justify-center h-full gap-0.5 lg:gap-1 transition-colors",
                cartItemsCount > 0 ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <ShoppingCart className={cn(
                  "h-5 w-5 lg:h-6 lg:w-6 transition-all",
                  cartItemsCount > 0 ? "stroke-[2]" : "stroke-[1.5]"
                )} />
                {cartItemsCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full px-0.5"
                  >
                    {cartItemsCount > 99 ? "99+" : cartItemsCount}
                  </motion.span>
                )}
              </div>
              <span className={cn(
                "text-[10px] lg:text-xs transition-all",
                cartItemsCount > 0 ? "font-semibold" : "font-medium"
              )}>
                Carrinho
              </span>
            </Link>
          ) : (
            <div className="relative flex flex-col items-center justify-center h-full gap-0.5 lg:gap-1 text-muted-foreground">
              <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 stroke-[1.5]" />
              <span className="text-[10px] lg:text-xs font-medium">Carrinho</span>
            </div>
          )}
        </motion.div>
      </div>
    </nav>
  );
}
