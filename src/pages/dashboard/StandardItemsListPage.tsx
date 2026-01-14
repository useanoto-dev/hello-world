// Standard Items List Page - For managing items in a category
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Plus, 
  Search, 
  ChevronLeft,
  Pencil,
  Copy,
  Trash2,
  UtensilsCrossed,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

interface StandardItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  item_type: string;
  is_premium: boolean;
  is_active: boolean;
  display_order: number;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

const ITEM_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  tradicional: { label: "Tradicional", color: "bg-blue-100 text-blue-700" },
  especial: { label: "Especial", color: "bg-amber-100 text-amber-700" },
  promocional: { label: "Promoção", color: "bg-green-100 text-green-700" },
};

export default function StandardItemsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StandardItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryId || "all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (storeId) {
      loadItems();
    }
  }, [selectedCategory, storeId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      // Load standard categories (not pizza)
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .eq("store_id", profile.store_id)
        .neq("category_type", "pizza")
        .eq("is_active", true);

      setCategories((cats as Category[]) || []);

      // If categoryId is provided, set it
      if (categoryId) {
        setSelectedCategory(categoryId);
      } else if (cats && cats.length > 0) {
        setSelectedCategory(cats[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("standard_items")
        .select("*")
        .eq("store_id", storeId)
        .order("display_order");

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data } = await query;
      setItems((data as StandardItem[]) || []);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (item: StandardItem) => {
    try {
      const { error } = await supabase
        .from("standard_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;
      
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_active: !i.is_active } : i
      ));
      
      toast.success(item.is_active ? "Item desativado" : "Item ativado");
    } catch (error: any) {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleDelete = async (item: StandardItem) => {
    if (!confirm(`Excluir item "${item.name}"?`)) return;

    try {
      // First delete prices
      await supabase
        .from("standard_item_prices")
        .delete()
        .eq("item_id", item.id);

      // Then delete item
      const { error } = await supabase
        .from("standard_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Item excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir item");
    }
  };

  const handleDuplicate = async (item: StandardItem) => {
    try {
      // Get item prices
      const { data: prices } = await supabase
        .from("standard_item_prices")
        .select("*")
        .eq("item_id", item.id);

      // Create new item
      const { data: newItem, error } = await supabase
        .from("standard_items")
        .insert({
          store_id: storeId,
          category_id: item.category_id,
          name: `${item.name} (Cópia)`,
          description: item.description,
          image_url: item.image_url,
          item_type: item.item_type,
          is_premium: item.is_premium,
          is_active: true,
          display_order: items.length,
        })
        .select()
        .single();

      if (error) throw error;

      // Copy prices
      if (prices && prices.length > 0 && newItem) {
        const newPrices = prices.map(p => ({
          item_id: newItem.id,
          size_id: p.size_id,
          price: p.price,
          is_available: p.is_available,
        }));

        await supabase.from("standard_item_prices").insert(newPrices);
      }

      toast.success("Item duplicado!");
      loadItems();
    } catch (error: any) {
      toast.error("Erro ao duplicar item");
    }
  };

  const handleEdit = (item: StandardItem) => {
    navigate(`/dashboard/item/edit?id=${item.id}&categoryId=${item.category_id}`);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || item.item_type === filterType;
    return matchesSearch && matchesType;
  });

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => navigate("/dashboard/products")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold">Itens do Cardápio</h1>
          <p className="text-[11px] text-muted-foreground">
            {currentCategory?.name || "Todas categorias"}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="tradicional">🍔 Tradicional</SelectItem>
              <SelectItem value="especial">⭐ Especial</SelectItem>
              <SelectItem value="promocional">🏷️ Promoção</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button 
            onClick={() => navigate(`/dashboard/item/new${selectedCategory !== "all" ? `?categoryId=${selectedCategory}` : ""}`)}
            className="ml-auto gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </Button>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-4xl mb-3">🍔</div>
            <h3 className="font-semibold text-lg mb-1">Nenhum item cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione seu primeiro item ao cardápio
            </p>
            <Button 
              onClick={() => navigate(`/dashboard/item/new${selectedCategory !== "all" ? `?categoryId=${selectedCategory}` : ""}`)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Item
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border divide-y">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center p-4 gap-4",
                  !item.is_active && "opacity-60"
                )}
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", ITEM_TYPE_LABELS[item.item_type]?.color)}
                    >
                      {ITEM_TYPE_LABELS[item.item_type]?.label || item.item_type}
                    </Badge>
                    {item.is_premium && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                        Premium
                      </Badge>
                    )}
                    {!item.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ativo</span>
                  <Switch 
                    checked={item.is_active}
                    onCheckedChange={() => handleToggleActive(item)}
                  />
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      Ações
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(item)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
