import { useRef, useEffect, useState } from "react";

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
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);

  // Update indicator position when active category changes
  useEffect(() => {
    const selectedIndex = categories.findIndex((c) => c.id === activeCategory);
    if (selectedIndex >= 0 && tabsRef.current[selectedIndex] && containerRef.current) {
      const container = containerRef.current;
      const tab = tabsRef.current[selectedIndex];
      
      if (tab) {
        const tabRect = tab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate position relative to scrollable container
        const left = tab.offsetLeft;
        const width = tabRect.width;
        
        setIndicatorStyle({ left, width });
        
        // Auto-scroll to center the active tab
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
        className="relative flex whitespace-nowrap px-4 py-3 gap-3 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Sliding indicator */}
        {indicatorStyle && (
          <div
            className="absolute top-3 h-[calc(100%-24px)] bg-[#FFB200] rounded-full shadow-md transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
        )}
        
        {categories.map((category, index) => {
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              ref={(el) => { tabsRef.current[index] = el; }}
              className={`
                relative z-10 px-5 py-2.5 text-sm font-semibold rounded-full whitespace-nowrap
                transition-all duration-300 ease-out
                ${isActive
                  ? "text-white scale-105"
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
