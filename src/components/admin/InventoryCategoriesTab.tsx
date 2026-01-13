import { useState, useEffect } from "react";
import { Plus, Package, MoreVertical, Pencil, Trash2, Eye, EyeOff, ChevronRight, AlertTriangle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryManager from "./InventoryManager";
import InventoryMovementReport from "./InventoryMovementReport";
interface InventoryCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_alert: number;
  unit: string;
  category_name: string;
}

interface InventoryCategoriesTabProps {
  storeId: string;
}

export default function InventoryCategoriesTab({ storeId }: InventoryCategoriesTabProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);
  const [showMovementReport, setShowMovementReport] = useState(false);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "",
  });

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    try {
      // Load categories
      const { data: cats, error: catsError } = await supabase
        .from("inventory_categories")
        .select("*")
        .eq("store_id", storeId)
        .order("display_order");

      if (catsError) throw catsError;
      setCategories(cats || []);

      // Load low stock products
      const { data: products, error: productsError } = await supabase
        .from("inventory_products")
        .select(`
          id, name, stock_quantity, min_stock_alert, unit,
          inventory_categories!inner(name)
        `)
        .eq("store_id", storeId)
        .eq("is_active", true);

      if (productsError) throw productsError;

      const lowStock = (products || [])
        .filter((p: any) => p.stock_quantity <= p.min_stock_alert)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          stock_quantity: p.stock_quantity,
          min_stock_alert: p.min_stock_alert,
          unit: p.unit,
          category_name: p.inventory_categories.name,
        }));

      setLowStockProducts(lowStock);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const openCategoryModal = (category?: InventoryCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || "",
        icon: category.icon || "",
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: "",
        description: "",
        icon: "",
      });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const data = {
        store_id: storeId,
        name: categoryForm.name.trim(),
        description: categoryForm.description || null,
        icon: categoryForm.icon || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("inventory_categories")
          .update(data)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const maxOrder = Math.max(0, ...categories.map(c => c.display_order || 0));
        const { error } = await supabase
          .from("inventory_categories")
          .insert({ ...data, display_order: maxOrder + 1 });

        if (error) throw error;
        toast.success("Categoria criada!");
      }

      setShowCategoryModal(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Erro ao salvar categoria");
    }
  };

  const handleDeleteCategory = async (category: InventoryCategory) => {
    if (!confirm(`Excluir categoria "${category.name}"? Todos os produtos serão removidos.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("inventory_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
      toast.success("Categoria excluída!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir categoria");
    }
  };

  const handleToggleActive = async (category: InventoryCategory) => {
    try {
      const { error } = await supabase
        .from("inventory_categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // If movement report is open, show it
  if (showMovementReport) {
    return (
      <InventoryMovementReport
        storeId={storeId}
        onBack={() => setShowMovementReport(false)}
      />
    );
  }

  // If a category is selected, show the inventory manager
  if (selectedCategory) {
    return (
      <InventoryManager
        category={selectedCategory}
        storeId={storeId}
        onBack={() => {
          setSelectedCategory(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            Gerencie categorias e produtos com controle de estoque
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowMovementReport(true)} className="gap-2">
            <History className="w-4 h-4" />
            Histórico
          </Button>
          <Button onClick={() => openCategoryModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle className="text-base">Produtos com Estoque Baixo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map(p => (
                <Badge key={p.id} variant="destructive" className="gap-1">
                  {p.name}: {p.stock_quantity} {p.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma categoria de estoque</h3>
            <p className="text-muted-foreground text-sm text-center mb-4 max-w-sm">
              Crie sua primeira categoria para começar a controlar o estoque.
            </p>
            <Button onClick={() => openCategoryModal()} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card 
              key={category.id} 
              className={`group cursor-pointer transition-all hover:shadow-md ${!category.is_active ? "opacity-60" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <div className="flex items-center gap-2">
                      {category.icon && (
                        <span className="text-xl">{category.icon}</span>
                      )}
                      <CardTitle className="text-base truncate">
                        {category.name}
                      </CardTitle>
                      {!category.is_active && (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </div>
                    {category.description && (
                      <CardDescription className="mt-1 text-xs line-clamp-2">
                        {category.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openCategoryModal(category)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(category)}>
                        {category.is_active ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCategory(category)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent onClick={() => setSelectedCategory(category)}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="w-4 h-4" />
                    <span>Gerenciar produtos</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria de Estoque"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Atualize as informações da categoria"
                : "Crie uma categoria para organizar seus produtos com estoque"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Bebidas, Ingredientes, Embalagens"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Breve descrição da categoria"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone (emoji)</Label>
              <Input
                id="icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                placeholder="📦"
                className="w-20"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
