import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string) => void;
  enableMorphAnimation?: boolean;
}

// Map category slugs/names to emojis
const categoryEmojis: Record<string, string> = {
  pizza: "🍕",
  pizzas: "🍕",
  bebida: "🥤",
  bebidas: "🥤",
  drinks: "🥤",
  hamburguer: "🍔",
  hamburgueres: "🍔",
  burger: "🍔",
  burgers: "🍔",
  sobremesa: "🍰",
  sobremesas: "🍰",
  dessert: "🍰",
  desserts: "🍰",
  lanche: "🥪",
  lanches: "🥪",
  salgado: "🥟",
  salgados: "🥟",
  porcao: "🍟",
  porcoes: "🍟",
  acai: "🫐",
  sorvete: "🍨",
  sorvetes: "🍨",
  japonesa: "🍣",
  sushi: "🍣",
  massa: "🍝",
  massas: "🍝",
  salada: "🥗",
  saladas: "🥗",
  combo: "📦",
  combos: "📦",
  promocao: "🔥",
  promocoes: "🔥",
  localizacao: "📍",
  sobre_nos: "ℹ️",
  sobre: "ℹ️",
};

function getCategoryEmoji(category: Category): string {
  const slug = category.slug?.toLowerCase() || "";
  const name = category.name.toLowerCase();
  
  // Check icon first (if it's an emoji)
  if (category.icon && /\p{Emoji}/u.test(category.icon)) {
    return category.icon;
  }
  
  // Check slug
  for (const [key, emoji] of Object.entries(categoryEmojis)) {
    if (slug.includes(key) || name.includes(key)) {
      return emoji;
    }
  }
  
  return "📋"; // Default
}

export default function CategoryTabs({ 
  categories, 
  activeCategory, 
  onCategoryChange,
  enableMorphAnimation = true
}: CategoryTabsProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialRender(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to active category
  useEffect(() => {
    const selectedIndex = categories.findIndex((c) => c.id === activeCategory);
    if (selectedIndex >= 0 && tabsRef.current[selectedIndex] && containerRef.current) {
      const container = containerRef.current;
      const tab = tabsRef.current[selectedIndex];
      
      if (tab) {
        const tabRect = tab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate the scroll position to center the tab
        const scrollLeft = tab.offsetLeft - (containerRect.width / 2) + (tabRect.width / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth'
        });
      }
    }
  }, [activeCategory, categories]);

  if (categories.length === 0) return null;

  return (
    <div className="bg-card border-b border-border/50 px-3 sm:px-4 py-3 mt-4">
      <div className="max-w-4xl mx-auto">
        <div 
          ref={containerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {categories.map((category, index) => {
            const isActive = activeCategory === category.id;
            const emoji = getCategoryEmoji(category);
            
            return (
              <button
                ref={(el) => { tabsRef.current[index] = el; }}
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2.5 rounded-full font-medium transition-colors duration-150 snap-start flex-shrink-0",
                  isActive
                    ? "text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
                aria-pressed={isActive}
              >
                {/* Active indicator with smooth transition */}
                {isActive && (
                  <motion.div
                    layoutId={enableMorphAnimation && !isInitialRender ? "category-active-indicator" : undefined}
                    className="absolute inset-0 gradient-primary rounded-full"
                    initial={false}
                    transition={{
                      type: "tween",
                      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth feel
                      duration: 0.35,
                    }}
                  />
                )}
                <span className="relative z-10 text-base">{emoji}</span>
                <span className="relative z-10 font-semibold text-sm">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
