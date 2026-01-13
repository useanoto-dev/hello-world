import { useState } from "react";
import { Search, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/formatters";
import { Category, OptionItem, OptionGroup, getItemPrice } from "@/hooks/usePDVData";

interface PDVProductsPanelProps {
  allDisplayItems: OptionItem[];
  allDisplayCategories: Category[];
  getSecondaryGroups: (categoryId: string) => OptionGroup[];
  onProductClick: (item: OptionItem) => void;
}

export function PDVProductsPanel({
  allDisplayItems,
  allDisplayCategories,
  getSecondaryGroups,
  onProductClick,
}: PDVProductsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredItems = allDisplayItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      {/* Search & Categories */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <TabsList className="flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          {allDisplayCategories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs gap-1">
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={activeCategory} className="flex-1 mt-3">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map(item => {
                const price = getItemPrice(item);
                const hasPromo = item.promotional_price !== null && price === item.promotional_price;
                const isInventoryItem = item.id.startsWith('inv-');
                const isRegularProduct = item.id.startsWith('prod-');
                const hasComplements = !isInventoryItem && !isRegularProduct && getSecondaryGroups(item.category_id || "").length > 0;
                const hasVariations = item.variations && item.variations.length > 0;
                
                return (
                  <Card
                    key={item.id}
                    onClick={() => onProductClick(item)}
                    className="p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all relative"
                  >
                    {isInventoryItem && (
                      <Badge variant="secondary" className="absolute top-2 right-2 text-[9px] px-1.5">
                        Estoque
                      </Badge>
                    )}
                    {hasComplements && (
                      <Badge className="absolute top-2 right-2 text-[9px] px-1.5">
                        +Adicionais
                      </Badge>
                    )}
                    {hasVariations && (
                      <Badge variant="outline" className="absolute top-2 right-2 text-[9px] px-1.5 bg-background border-primary text-primary">
                        <Tag className="w-2.5 h-2.5 mr-0.5" />
                        {item.variations!.length} tam.
                      </Badge>
                    )}
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-20 object-cover rounded-md mb-2"
                      />
                    )}
                    <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                    {item.category_name && (
                      <p className="text-xs text-muted-foreground">{item.category_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {hasVariations ? (
                        <p className="text-primary font-semibold text-sm">
                          {formatCurrency(Math.min(...item.variations!.map(v => v.price)))} - {formatCurrency(Math.max(...item.variations!.map(v => v.price)))}
                        </p>
                      ) : (
                        <>
                          <p className="text-primary font-semibold">
                            {formatCurrency(price)}
                          </p>
                          {hasPromo && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(item.additional_price)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
              
              {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {allDisplayCategories.length === 0 
                    ? "Cadastre categorias e produtos na tela Produtos"
                    : "Nenhum produto encontrado"}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
