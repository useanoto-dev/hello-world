import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FSWCategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const FSWCategoryTabs = ({ categories, activeCategory, onCategoryChange }: FSWCategoryTabsProps) => {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 p-4">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "secondary"}
            className={`rounded-full whitespace-nowrap min-w-fit ${
              activeCategory === category.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="h-0" />
    </ScrollArea>
  );
};

export default FSWCategoryTabs;
