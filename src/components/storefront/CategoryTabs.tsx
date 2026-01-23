import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useRef, useEffect } from "react";

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

export default function CategoryTabs({ 
  categories, 
  activeCategory, 
  onCategoryChange,
}: CategoryTabsProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active category
  useEffect(() => {
    const selectedIndex = categories.findIndex((c) => c.id === activeCategory);
    if (selectedIndex >= 0 && tabsRef.current[selectedIndex] && containerRef.current) {
      const container = containerRef.current;
      const tab = tabsRef.current[selectedIndex];
      
      if (tab) {
        const tabRect = tab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
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
    <div className="sticky top-0 z-10 bg-background font-storefront mt-4">
      <div 
        ref={containerRef} 
        className="flex whitespace-nowrap px-4 py-3 gap-3 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category, index) => {
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              ref={(el) => { tabsRef.current[index] = el; }}
              className={`
                px-5 py-2.5 text-sm font-semibold rounded-full whitespace-nowrap
                transition-all duration-300 ease-out
                ${isActive
                  ? "bg-[#FFB200] text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 scale-100"
                }
              `}
              onClick={() => onCategoryChange(category.id)}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
