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
    <ScrollArea className="w-full">
      <div ref={containerRef} className="flex gap-3 px-5 py-4">
        {categories.map((category, index) => {
          const isActive = activeCategory === category.id;
          
          return (
            <Button
              key={category.id}
              ref={(el) => { tabsRef.current[index] = el; }}
              variant="outline"
              className={`
                rounded-full whitespace-nowrap min-w-fit px-5 h-10 text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }
              `}
              onClick={() => onCategoryChange(category.id)}
            >
              {category.name}
            </Button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="h-0" />
    </ScrollArea>
  );
}
