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

interface PizzaFlavor {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  flavor_type: string;
  is_premium: boolean;
  is_active: boolean;
  display_order: number;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

const FLAVOR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  salgada: { label: "Salgada", color: "bg-blue-100 text-blue-700" },
  doce: { label: "Doce", color: "bg-pink-100 text-pink-700" },
  especial: { label: "Especial", color: "bg-amber-100 text-amber-700" },
};

export default function PizzaFlavorsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  
  const [loading, setLoading] = useState(true);
  const [flavors, setFlavors] = useState<PizzaFlavor[]>([]);
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
      loadFlavors();
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

      // Load pizza categories
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .eq("store_id", profile.store_id)
        .eq("category_type", "pizza")
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

  const loadFlavors = async () => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("pizza_flavors")
        .select("*")
        .eq("store_id", storeId)
        .order("display_order");

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data } = await query;
      setFlavors((data as PizzaFlavor[]) || []);
    } catch (error) {
      console.error("Error loading flavors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (flavor: PizzaFlavor) => {
    try {
      const { error } = await supabase
        .from("pizza_flavors")
        .update({ is_active: !flavor.is_active })
        .eq("id", flavor.id);

      if (error) throw error;
      
      setFlavors(prev => prev.map(f => 
        f.id === flavor.id ? { ...f, is_active: !f.is_active } : f
      ));
      
      toast.success(flavor.is_active ? "Sabor desativado" : "Sabor ativado");
    } catch (error: any) {
      toast.error("Erro ao atualizar sabor");
    }
  };

  const handleDelete = async (flavor: PizzaFlavor) => {
    if (!confirm(`Excluir sabor "${flavor.name}"?`)) return;

    try {
      // First delete prices
      await supabase
        .from("pizza_flavor_prices")
        .delete()
        .eq("flavor_id", flavor.id);

      // Then delete flavor
      const { error } = await supabase
        .from("pizza_flavors")
        .delete()
        .eq("id", flavor.id);

      if (error) throw error;
      
      setFlavors(prev => prev.filter(f => f.id !== flavor.id));
      toast.success("Sabor excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir sabor");
    }
  };

  const handleDuplicate = async (flavor: PizzaFlavor) => {
    try {
      // Get flavor prices
      const { data: prices } = await supabase
        .from("pizza_flavor_prices")
        .select("*")
        .eq("flavor_id", flavor.id);

      // Create new flavor
      const { data: newFlavor, error } = await supabase
        .from("pizza_flavors")
        .insert({
          store_id: storeId,
          category_id: flavor.category_id,
          name: `${flavor.name} (Cópia)`,
          description: flavor.description,
          image_url: flavor.image_url,
          flavor_type: flavor.flavor_type,
          is_premium: flavor.is_premium,
          is_active: true,
          display_order: flavors.length,
        })
        .select()
        .single();

      if (error) throw error;

      // Copy prices
      if (prices && prices.length > 0 && newFlavor) {
        const newPrices = prices.map(p => ({
          flavor_id: newFlavor.id,
          size_id: p.size_id,
          price: p.price,
          surcharge: p.surcharge,
          is_available: p.is_available,
        }));

        await supabase.from("pizza_flavor_prices").insert(newPrices);
      }

      toast.success("Sabor duplicado!");
      loadFlavors();
    } catch (error: any) {
      toast.error("Erro ao duplicar sabor");
    }
  };

  const handleEdit = (flavor: PizzaFlavor) => {
    navigate(`/dashboard/pizza-flavor/edit?id=${flavor.id}&categoryId=${flavor.category_id}`);
  };

  const filteredFlavors = flavors.filter(flavor => {
    const matchesSearch = !searchTerm || 
      flavor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || flavor.flavor_type === filterType;
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
          <h1 className="text-base font-semibold">Sabores de Pizza</h1>
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
              <SelectItem value="salgada">🍕 Salgadas</SelectItem>
              <SelectItem value="doce">🍫 Doces</SelectItem>
              <SelectItem value="especial">⭐ Especiais</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar sabor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button 
            onClick={() => navigate(`/dashboard/pizza-flavor/new${selectedCategory !== "all" ? `?categoryId=${selectedCategory}` : ""}`)}
            className="ml-auto gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Sabor
          </Button>
        </div>

        {/* Flavors List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredFlavors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-4xl mb-3">🍕</div>
            <h3 className="font-semibold text-lg mb-1">Nenhum sabor cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione seu primeiro sabor de pizza
            </p>
            <Button 
              onClick={() => navigate(`/dashboard/pizza-flavor/new${selectedCategory !== "all" ? `?categoryId=${selectedCategory}` : ""}`)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Sabor
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border divide-y">
            {filteredFlavors.map((flavor) => (
              <div 
                key={flavor.id}
                className={cn(
                  "flex items-center p-4 gap-4",
                  !flavor.is_active && "opacity-60"
                )}
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {flavor.image_url ? (
                    <img 
                      src={flavor.image_url} 
                      alt={flavor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{flavor.name}</h3>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", FLAVOR_TYPE_LABELS[flavor.flavor_type]?.color)}
                    >
                      {FLAVOR_TYPE_LABELS[flavor.flavor_type]?.label || flavor.flavor_type}
                    </Badge>
                    {flavor.is_premium && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                        Premium
                      </Badge>
                    )}
                    {!flavor.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  {flavor.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {flavor.description}
                    </p>
                  )}
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ativo</span>
                  <Switch 
                    checked={flavor.is_active}
                    onCheckedChange={() => handleToggleActive(flavor)}
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
                    <DropdownMenuItem onClick={() => handleEdit(flavor)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(flavor)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(flavor)}
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
