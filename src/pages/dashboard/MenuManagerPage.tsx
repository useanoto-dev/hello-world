// Menu Manager Page - Anota AI Style
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Pencil,
  Copy,
  Trash2,
  Eye,
  Link2,
  CircleSlash,
  UtensilsCrossed,
  GripVertical,
  Package,
  BoxIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Custom drag handle icon (6 dots pattern like Anota AI)
const DragHandle = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 16 20" 
    fill="none" 
    className={className}
    style={{ width: 20, height: 20 }}
  >
    <circle cx="4" cy="4" r="1.5" fill="currentColor" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    <circle cx="4" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    <circle cx="4" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NewCategoryModal, CategoryFormData } from "@/components/admin/NewCategoryModal";
import { MenuItemWizard, ItemFormData } from "@/components/admin/MenuItemWizard";
import { SortableCategoryItem, DragHandleButton } from "@/components/admin/SortableCategoryItem";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  category_type: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean | null;
  has_stock_control?: boolean;
  stock_quantity?: number;
  min_stock_alert?: number;
}

interface PizzaSize {
  id: string;
  name: string;
  slices: number;
  max_flavors: number;
  base_price: number;
  price_model: string;
  image_url: string | null;
  is_active: boolean;
}

interface PizzaFlavor {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  flavor_type: string;
  is_premium: boolean;
  is_active: boolean;
}

export default function MenuManagerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("categories");
  
  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [categoryPizzaSizes, setCategoryPizzaSizes] = useState<Record<string, PizzaSize[]>>({});
  const [categoryPizzaFlavors, setCategoryPizzaFlavors] = useState<Record<string, PizzaFlavor[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set());
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showItemWizard, setShowItemWizard] = useState(false);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | null>(null);
  
  // Inline price edit state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  
  // Image upload state
  const [uploadingFlavorImage, setUploadingFlavorImage] = useState<string | null>(null);
  const [uploadingSizeImage, setUploadingSizeImage] = useState<string | null>(null);
  
  // Stock adjustment modal state
  const [stockAdjustmentOpen, setStockAdjustmentOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product & { categoryId: string } | null>(null);
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'add' | 'remove'>('add');
  const [stockAdjustmentQty, setStockAdjustmentQty] = useState('');
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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

      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", profile.store_id)
        .order("display_order");

      setCategories((cats as Category[]) || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryProducts = async (categoryId: string, categoryType?: string | null) => {
    if (loadingProducts.has(categoryId)) return;
    
    setLoadingProducts(prev => new Set(prev).add(categoryId));
    
    try {
      // For pizza categories, load pizza sizes AND flavors
      if (categoryType === 'pizza') {
        const [sizesResult, flavorsResult] = await Promise.all([
          supabase
            .from("pizza_sizes")
            .select("id, name, slices, max_flavors, base_price, price_model, image_url, is_active")
            .eq("category_id", categoryId)
            .order("display_order"),
          supabase
            .from("pizza_flavors")
            .select("id, name, description, image_url, flavor_type, is_premium, is_active")
            .eq("category_id", categoryId)
            .order("display_order")
        ]);
        
        setCategoryPizzaSizes(prev => ({
          ...prev,
          [categoryId]: (sizesResult.data as PizzaSize[]) || []
        }));
        
        setCategoryPizzaFlavors(prev => ({
          ...prev,
          [categoryId]: (flavorsResult.data as PizzaFlavor[]) || []
        }));
      } else {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, description, price, promotional_price, image_url, is_available, is_featured, has_stock_control, stock_quantity, min_stock_alert")
          .eq("category_id", categoryId)
          .order("display_order");
        
        setCategoryProducts(prev => ({
          ...prev,
          [categoryId]: (products as Product[]) || []
        }));
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryId);
        return newSet;
      });
    }
  };

  const toggleCategory = (categoryId: string, categoryType?: string | null) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
        // Load products/sizes when expanding
        const isPizza = categoryType === 'pizza';
        if (isPizza) {
          if (!categoryPizzaSizes[categoryId]) {
            loadCategoryProducts(categoryId, categoryType);
          }
        } else {
          if (!categoryProducts[categoryId]) {
            loadCategoryProducts(categoryId, categoryType);
          }
        }
      }
      return newSet;
    });
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for categories
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      
      // Update local state immediately for smooth UX
      setCategories(newCategories);

      // Update database with new order
      try {
        const updates = newCategories.map((cat, index) => ({
          id: cat.id,
          display_order: index,
        }));

        for (const update of updates) {
          await supabase
            .from("categories")
            .update({ display_order: update.display_order })
            .eq("id", update.id);
        }

        toast.success("Ordem das categorias atualizada!");
      } catch (error) {
        console.error("Error updating category order:", error);
        toast.error("Erro ao atualizar ordem");
        // Revert on error
        loadData();
      }
    }
  };

  const openCategoryPage = (category?: Category) => {
    if (category) {
      navigate(`/dashboard/category/edit?edit=${category.id}`);
    } else {
      navigate("/dashboard/category/new");
    }
  };

  const openItemWizard = (categoryId?: string, isPizza?: boolean) => {
    if (isPizza && categoryId) {
      navigate(`/dashboard/pizza-flavor/new?categoryId=${categoryId}`);
    } else {
      setPreselectedCategoryId(categoryId || null);
      setShowItemWizard(true);
    }
  };

  const handleSaveCategory = async (formData: CategoryFormData, createItems?: boolean) => {
    if (!storeId || !formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const slug = formData.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const data = {
        store_id: storeId,
        name: formData.name.trim(),
        slug,
        description: formData.isPromotion ? formData.promotionMessage : null,
        is_active: formData.availability !== "paused",
      };

      let newCategoryId: string | null = null;

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(data)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada!");
        newCategoryId = editingCategory.id;
      } else {
        const maxOrder = Math.max(0, ...categories.map(c => c.display_order || 0));
        const { data: insertedCategory, error } = await supabase
          .from("categories")
          .insert({ ...data, display_order: maxOrder + 1 })
          .select('id')
          .single();

        if (error) throw error;
        toast.success("Categoria criada!");
        newCategoryId = insertedCategory?.id || null;
      }

      setShowCategoryModal(false);
      await loadData();
      
      // If createItems is true, open the item creation wizard
      if (createItems && newCategoryId) {
        setPreselectedCategoryId(newCategoryId);
        setShowItemWizard(true);
      }
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Erro ao salvar categoria");
    }
  };

  const handleSaveItem = async (itemData: ItemFormData, action: 'save' | 'save-and-new') => {
    try {
      if (!storeId) return;

      const price = parseFloat(itemData.price.replace(',', '.')) || 0;

      const { data: newProduct, error } = await supabase.from("products").insert({
        store_id: storeId,
        category_id: itemData.categoryId,
        name: itemData.name,
        description: itemData.description,
        price: price,
        image_url: itemData.imageUrl,
        is_available: itemData.availability !== 'paused',
        has_stock_control: itemData.hasStockControl,
        stock_quantity: itemData.hasStockControl ? itemData.stockQuantity : 0,
        min_stock_alert: itemData.hasStockControl ? itemData.minStockAlert : 5,
        unit: itemData.unit,
      }).select().single();

      if (error) throw error;
      
      toast.success("Item criado com sucesso!");
      
      // Update local state immediately without page refresh
      if (newProduct) {
        setCategoryProducts(prev => {
          const currentProducts = prev[itemData.categoryId] || [];
          return {
            ...prev,
            [itemData.categoryId]: [...currentProducts, newProduct as Product]
          };
        });
        
        // Expand the category if not already expanded
        setExpandedCategories(prev => {
          const newSet = new Set(prev);
          newSet.add(itemData.categoryId);
          return newSet;
        });
      }
      
      if (action === 'save') {
        setShowItemWizard(false);
      }
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast.error(error.message || "Erro ao salvar item");
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Excluir categoria "${category.name}"? Todos os itens serão removidos.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
      toast.success("Categoria excluída!");
      loadData();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "Erro ao excluir categoria");
    }
  };

  const handleDuplicateCategory = async (category: Category) => {
    try {
      const maxOrder = Math.max(0, ...categories.map(c => c.display_order || 0));
      const newSlug = `${category.slug}-copia`;
      
      const { error } = await supabase.from("categories").insert({
        store_id: storeId,
        name: `${category.name} (Cópia)`,
        slug: newSlug,
        description: category.description,
        icon: category.icon,
        image_url: category.image_url,
        display_order: maxOrder + 1,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Categoria duplicada!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao duplicar categoria");
    }
  };

  // Inline price edit handlers
  const handleStartEditPrice = (product: Product) => {
    setEditingPriceId(product.id);
    setEditingPriceValue(product.price.toFixed(2).replace('.', ','));
  };

  const handleSavePrice = async (product: Product, categoryId: string) => {
    const newPrice = parseFloat(editingPriceValue.replace(',', '.'));
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ price: newPrice })
        .eq("id", product.id);

      if (error) throw error;

      // Update local state
      setCategoryProducts(prev => ({
        ...prev,
        [categoryId]: prev[categoryId].map(p =>
          p.id === product.id ? { ...p, price: newPrice } : p
        )
      }));

      setEditingPriceId(null);
      toast.success("Preço atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar preço");
    }
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setEditingPriceValue("");
  };

  const handleToggleProductAvailable = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_available: !product.is_available })
        .eq("id", product.id);

      if (error) throw error;
      
      // Update local state
      setCategoryProducts(prev => {
        const newProducts = { ...prev };
        for (const catId in newProducts) {
          newProducts[catId] = newProducts[catId].map(p => 
            p.id === product.id ? { ...p, is_available: !p.is_available } : p
          );
        }
        return newProducts;
      });
    } catch (error: any) {
      toast.error("Erro ao atualizar item");
    }
  };

  // Stock adjustment handlers
  const openStockAdjustment = (product: Product, categoryId: string) => {
    setSelectedStockProduct({ ...product, categoryId });
    setStockAdjustmentType('add');
    setStockAdjustmentQty('');
    setStockAdjustmentReason('');
    setStockAdjustmentOpen(true);
  };

  const handleSaveStockAdjustment = async () => {
    if (!selectedStockProduct || !stockAdjustmentQty || !storeId) return;
    
    setSavingStock(true);
    try {
      const qty = parseInt(stockAdjustmentQty) || 0;
      const previousStock = selectedStockProduct.stock_quantity || 0;
      const newStock = stockAdjustmentType === 'add' 
        ? previousStock + qty 
        : Math.max(0, previousStock - qty);

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", selectedStockProduct.id);

      if (updateError) throw updateError;

      // Log movement
      await supabase.from("inventory_movements").insert({
        store_id: storeId,
        product_id: selectedStockProduct.id,
        movement_type: stockAdjustmentType === 'add' ? 'entrada' : 'saida',
        quantity: qty,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: stockAdjustmentReason || (stockAdjustmentType === 'add' ? 'Entrada manual' : 'Saída manual'),
        created_by: 'admin',
      });

      // Update local state
      setCategoryProducts(prev => ({
        ...prev,
        [selectedStockProduct.categoryId]: prev[selectedStockProduct.categoryId]?.map(p =>
          p.id === selectedStockProduct.id ? { ...p, stock_quantity: newStock } : p
        ) || []
      }));

      toast.success("Estoque atualizado!");
      setStockAdjustmentOpen(false);
    } catch (error: any) {
      console.error("Error updating stock:", error);
      toast.error("Erro ao atualizar estoque");
    } finally {
      setSavingStock(false);
    }
  };

  const handleDeleteProduct = async (product: Product, categoryId: string) => {
    if (!confirm(`Excluir "${product.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;
      
      // Update local state
      setCategoryProducts(prev => ({
        ...prev,
        [categoryId]: prev[categoryId].filter(p => p.id !== product.id)
      }));
      
      toast.success("Item excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir item");
    }
  };

  const handleDuplicateProduct = async (product: Product, categoryId: string) => {
    try {
      const { data: newProduct, error } = await supabase.from("products").insert({
        store_id: storeId,
        category_id: categoryId,
        name: `${product.name} (Cópia)`,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        is_available: true,
      }).select().single();

      if (error) throw error;
      
      // Update local state
      if (newProduct) {
        setCategoryProducts(prev => ({
          ...prev,
          [categoryId]: [...(prev[categoryId] || []), newProduct as Product]
        }));
      }
      
      toast.success("Item duplicado!");
    } catch (error: any) {
      toast.error("Erro ao duplicar item");
    }
  };

  const handleCopyLink = (product: Product) => {
    // Copy product link - you can customize this URL
    navigator.clipboard.writeText(`/cardapio#item-${product.id}`);
    toast.success("Link copiado!");
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold">Gestor de Cardápio</h1>
        <p className="text-[11px] text-muted-foreground">
          Gerencie categorias e produtos
        </p>
      </div>


      {/* Search and Actions Bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="categories">Categorias</SelectItem>
              <SelectItem value="items">Itens</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Pesquisar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Ações
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                // Expand all categories and load their products
                const allIds = new Set(categories.map(c => c.id));
                setExpandedCategories(allIds);
                // Load products for all categories
                categories.forEach(cat => {
                  if (!categoryProducts[cat.id]) {
                    loadCategoryProducts(cat.id);
                  }
                });
              }}>Expandir todas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                // Collapse all categories
                setExpandedCategories(new Set());
              }}>Recolher todas</DropdownMenuItem>
              <DropdownMenuItem>Reordenar categorias</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={() => openCategoryPage()} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4" />
            Nova categoria
          </Button>
        </div>
      </div>

      {/* Categories List with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredCategories.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {filteredCategories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                id={category.id}
                isActive={category.is_active}
              >
                {/* Orange Header - only show if has promotion description */}
                {category.description && (
                  <div className="bg-amber-400 text-center py-1.5">
                    <span className="text-sm font-medium text-white">PROMOÇÃO</span>
                  </div>
                )}
                
                {/* Category Content */}
                <div className="bg-card p-4">
                  <div className="flex items-center gap-4">
                    {/* Drag Handle */}
                    <DragHandleButton id={category.id} />
                
                {/* Category Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {category.icon && <span className="text-lg">{category.icon}</span>}
                    <h3 className="font-semibold">{category.name}</h3>
                    {!category.is_active && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                    <Badge variant="outline" className="mt-1 text-xs bg-amber-100 text-amber-700 border-amber-300">
                      {category.category_type === 'pizza' ? 'Pizza' : 'Itens principais'}
                    </Badge>
                  </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        Ações categoria
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        Exibição
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openCategoryPage(category)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateCategory(category)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
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
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(category.id, category.category_type)}
                  >
                    {expandedCategories.has(category.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedCategories.has(category.id) && (
                <div className="mt-4">
                  {loadingProducts.has(category.id) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                      ))}
                    </div>
                  ) : category.category_type === 'pizza' ? (
                    // Pizza Content (Sizes + Flavors)
                    <div className="space-y-6">
                      {/* Pizza Sizes Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">Tamanhos</h4>
                          <span className="text-xs text-gray-500">
                            {categoryPizzaSizes[category.id]?.length || 0} tamanhos
                          </span>
                        </div>
                        
                        {categoryPizzaSizes[category.id]?.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                            {categoryPizzaSizes[category.id].map((size) => (
                              <div 
                                key={size.id}
                                className={cn(
                                  "group bg-white rounded-xl overflow-hidden border border-gray-200 transition-all duration-200 ease-out hover:shadow-lg hover:border-primary/30",
                                  !size.is_active && "opacity-60"
                                )}
                              >
                                {/* Size Image */}
                                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100">
                                  {size.image_url ? (
                                    <img 
                                      src={size.image_url} 
                                      alt={size.name}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-5xl">🍕</span>
                                    </div>
                                  )}
                                  
                                  {/* Badges */}
                                  {!size.is_active && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-white shadow-sm">
                                      Inativo
                                    </div>
                                  )}
                                  
                                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold bg-primary text-white shadow-sm">
                                    até {size.max_flavors} {size.max_flavors === 1 ? 'sabor' : 'sabores'}
                                  </div>
                                  
                                  {/* Actions Overlay */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {/* Image Upload Button */}
                                    <label 
                                      className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow cursor-pointer"
                                      title="Alterar imagem"
                                    >
                                      <Pencil className="w-4 h-4 text-gray-700" />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          
                                          if (file.size > 2 * 1024 * 1024) {
                                            toast.error("Imagem deve ter no máximo 2MB");
                                            return;
                                          }
                                          
                                          setUploadingSizeImage(size.id);
                                          try {
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `pizza-sizes/${crypto.randomUUID()}.${fileExt}`;
                                            
                                            const { error: uploadError } = await supabase.storage
                                              .from('product-images')
                                              .upload(fileName, file);
                                            
                                            if (uploadError) throw uploadError;
                                            
                                            const { data: { publicUrl } } = supabase.storage
                                              .from('product-images')
                                              .getPublicUrl(fileName);
                                            
                                            await supabase
                                              .from("pizza_sizes")
                                              .update({ image_url: publicUrl })
                                              .eq("id", size.id);
                                            
                                            setCategoryPizzaSizes(prev => ({
                                              ...prev,
                                              [category.id]: prev[category.id].map(s =>
                                                s.id === size.id ? { ...s, image_url: publicUrl } : s
                                              )
                                            }));
                                            
                                            toast.success("Imagem atualizada!");
                                          } catch (error: any) {
                                            toast.error("Erro ao enviar imagem");
                                          } finally {
                                            setUploadingSizeImage(null);
                                          }
                                        }}
                                      />
                                    </label>
                                    
                                    {/* Edit Button */}
                                    <button 
                                      onClick={() => navigate(`/dashboard/category/edit?edit=${category.id}`)}
                                      className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow"
                                      title="Editar tamanho"
                                    >
                                      <Eye className="w-4 h-4 text-gray-700" />
                                    </button>
                                  </div>
                                  
                                  {/* Upload Loading Overlay */}
                                  {uploadingSizeImage === size.id && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Size Info */}
                                <div className="p-3">
                                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                                    {size.name}
                                  </h3>
                                  
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <span>{size.slices} fatias</span>
                                    <span>•</span>
                                    <span className="capitalize">{size.price_model === 'highest' ? 'Maior valor' : size.price_model === 'average' ? 'Média' : 'Somatório'}</span>
                                  </div>
                                  
                                  <div className="mt-2 flex items-center justify-between">
                                    <Popover 
                                      open={editingPriceId === `size-${size.id}`}
                                      onOpenChange={(open) => {
                                        if (open) {
                                          setEditingPriceId(`size-${size.id}`);
                                          setEditingPriceValue(size.base_price.toFixed(2));
                                        } else {
                                          setEditingPriceId(null);
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <button className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer inline-flex items-center gap-1">
                                          A partir de R$ {size.base_price.toFixed(2).replace('.', ',')}
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-48 p-3" align="start">
                                        <div className="space-y-2">
                                          <label className="text-xs font-medium text-gray-700">Preço Base</label>
                                          <div className="flex gap-2">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={editingPriceValue}
                                              onChange={(e) => setEditingPriceValue(e.target.value)}
                                              className="h-8 text-sm"
                                              autoFocus
                                            />
                                            <Button
                                              size="sm"
                                              className="h-8"
                                              onClick={async () => {
                                                const newPrice = parseFloat(editingPriceValue) || 0;
                                                try {
                                                  await supabase
                                                    .from("pizza_sizes")
                                                    .update({ base_price: newPrice })
                                                    .eq("id", size.id);
                                                  
                                                  setCategoryPizzaSizes(prev => ({
                                                    ...prev,
                                                    [category.id]: prev[category.id].map(s =>
                                                      s.id === size.id ? { ...s, base_price: newPrice } : s
                                                    )
                                                  }));
                                                  setEditingPriceId(null);
                                                  toast.success("Preço atualizado!");
                                                } catch (error) {
                                                  toast.error("Erro ao atualizar preço");
                                                }
                                              }}
                                            >
                                              Salvar
                                            </Button>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                    <Switch
                                      checked={size.is_active}
                                      onCheckedChange={async (checked) => {
                                        try {
                                          await supabase
                                            .from("pizza_sizes")
                                            .update({ is_active: checked })
                                            .eq("id", size.id);
                                          
                                          setCategoryPizzaSizes(prev => ({
                                            ...prev,
                                            [category.id]: prev[category.id].map(s =>
                                              s.id === size.id ? { ...s, is_active: checked } : s
                                            )
                                          }));
                                        } catch (error) {
                                          toast.error("Erro ao atualizar status");
                                        }
                                      }}
                                      className="data-[state=checked]:bg-green-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-sm">Adicione tamanhos a esta categoria</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : categoryProducts[category.id]?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                      {categoryProducts[category.id].map((product, index) => {
                        const hasPromo = product.promotional_price !== null && product.promotional_price < product.price;
                        const displayPrice = hasPromo ? product.promotional_price! : product.price;
                        const discountPercent = hasPromo 
                          ? Math.round(((product.price - product.promotional_price!) / product.price) * 100)
                          : 0;

                        return (
                          <div 
                            key={product.id}
                            className={cn(
                              "group bg-white rounded-xl overflow-hidden border border-gray-200 transition-all duration-200 ease-out hover:shadow-lg hover:border-primary/30",
                              !product.is_available && "opacity-60"
                            )}
                          >
                            {/* Product Image - Aspect 4/3 como Base44 */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-4xl opacity-50">🍽️</span>
                                </div>
                              )}
                              
                              {/* Badge - Top Left */}
                              {hasPromo && (
                                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-500 text-white shadow-sm">
                                  -{discountPercent}%
                                </div>
                              )}
                              
                              {!hasPromo && product.is_featured && (
                                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-destructive text-white shadow-sm">
                                  Popular
                                </div>
                              )}
                              
                              {!hasPromo && !product.is_featured && !product.is_available && (
                                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-white shadow-sm">
                                  Esgotado
                                </div>
                              )}
                              
                              {/* Actions Overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleCopyLink(product)}
                                  className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow"
                                  title="Copiar link"
                                >
                                  <Link2 className="w-4 h-4 text-gray-700" />
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button 
                                      className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow"
                                      title="Mais ações"
                                    >
                                      <ChevronDown className="w-4 h-4 text-gray-700" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="center" className="w-48">
                                    <DropdownMenuItem className="gap-2 text-sm">
                                      <Pencil className="w-4 h-4" />
                                      Editar item
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDuplicateProduct(product, category.id)}
                                      className="gap-2 text-sm"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleToggleProductAvailable(product)}
                                      className="gap-2 text-sm"
                                    >
                                      <CircleSlash className="w-4 h-4" />
                                      {product.is_available ? 'Esgotar' : 'Disponibilizar'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteProduct(product, category.id)}
                                      className="gap-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            {/* Product Info - Estilo Base44 */}
                            <div className="p-3">
                              <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                                {product.name}
                              </h3>
                              
                              {product.description && (
                                <p className="text-gray-500 text-xs line-clamp-1 mt-1">
                                  {product.description}
                                </p>
                              )}
                              
                              {/* Stock Indicator with Quick Adjust */}
                              {product.has_stock_control && product.stock_quantity !== undefined && (
                                <div className="mt-1.5 flex items-center justify-between">
                                  <div className={cn(
                                    "flex items-center gap-1.5 text-[10px] font-medium",
                                    product.stock_quantity === 0 
                                      ? "text-destructive" 
                                      : product.stock_quantity <= (product.min_stock_alert || 5)
                                        ? "text-amber-600"
                                        : "text-muted-foreground"
                                  )}>
                                    <Package className="w-3 h-3" />
                                    <span>
                                      {product.stock_quantity === 0 
                                        ? "Sem estoque" 
                                        : `${product.stock_quantity} em estoque`}
                                    </span>
                                    {product.stock_quantity > 0 && product.stock_quantity <= (product.min_stock_alert || 5) && (
                                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-300 text-amber-600">
                                        Baixo
                                      </Badge>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openStockAdjustment(product, category.id);
                                    }}
                                    className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                    title="Ajustar estoque"
                                  >
                                    <BoxIcon className="w-3 h-3 text-gray-500" />
                                  </button>
                                </div>
                              )}
                              
                              {/* Price - Estilo Base44 */}
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-baseline gap-2">
                                  {hasPromo && (
                                    <span className="text-xs text-gray-400 line-through">
                                      R$ {product.price.toFixed(2).replace('.', ',')}
                                    </span>
                                  )}
                                  <span className={cn(
                                    "text-sm font-bold",
                                    hasPromo ? "text-green-600" : "text-primary"
                                  )}>
                                    R$ {displayPrice.toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                                
                                {/* Edit Price Button */}
                                <Popover 
                                  open={editingPriceId === product.id}
                                  onOpenChange={(open) => {
                                    if (!open) handleCancelEditPrice();
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <button 
                                      onClick={() => handleStartEditPrice(product)}
                                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                      title="Editar preço"
                                    >
                                      <Pencil className="w-3 h-3 text-gray-500" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-3" align="end">
                                    <div className="space-y-3">
                                      <p className="text-sm font-medium">Editar preço</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">R$</span>
                                        <Input
                                          value={editingPriceValue}
                                          onChange={(e) => setEditingPriceValue(e.target.value)}
                                          placeholder="0,00"
                                          className="flex-1 h-8"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleSavePrice(product, category.id);
                                            } else if (e.key === 'Escape') {
                                              handleCancelEditPrice();
                                            }
                                          }}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={handleCancelEditPrice}
                                          className="flex-1 h-8"
                                        >
                                          Cancelar
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleSavePrice(product, category.id)}
                                          className="flex-1 h-8"
                                        >
                                          Salvar
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-3">😔</div>
                      <p className="text-lg font-medium text-gray-900">Nenhum item</p>
                      <p className="text-gray-500 text-sm">Adicione itens a esta categoria</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Add Item Button */}
              <div className="mt-4 flex items-center gap-4">
                <button 
                  onClick={() => openItemWizard(category.id, category.category_type === 'pizza')}
                  className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm"
                >
                  <Plus className="w-5 h-5" />
                  {category.category_type === 'pizza' ? 'Adicionar Sabor' : 'Adicionar Item'}
                </button>
                {category.category_type === 'pizza' && (
                  <button 
                    onClick={() => navigate(`/dashboard/pizza-flavors?categoryId=${category.id}`)}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
                  >
                    Ver todos os sabores
                  </button>
                )}
              </div>
            </div>
          </SortableCategoryItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Footer Count */}
      <p className="text-center text-muted-foreground text-sm">
        Exibindo {filteredCategories.length} de {categories.length} categorias
      </p>

      {/* Category Modal */}
      <NewCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
      />

      {/* Item Wizard */}
      <MenuItemWizard
        open={showItemWizard}
        onOpenChange={setShowItemWizard}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        preselectedCategoryId={preselectedCategoryId || undefined}
        onSave={handleSaveItem}
      />

      {/* Stock Adjustment Modal */}
      <Dialog open={stockAdjustmentOpen} onOpenChange={setStockAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>
          {selectedStockProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedStockProduct.image_url ? (
                  <img 
                    src={selectedStockProduct.image_url} 
                    alt={selectedStockProduct.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedStockProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Estoque atual: {selectedStockProduct.stock_quantity || 0} un
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de ajuste</Label>
                <Select value={stockAdjustmentType} onValueChange={(v) => setStockAdjustmentType(v as 'add' | 'remove')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">➕ Entrada (adicionar)</SelectItem>
                    <SelectItem value="remove">➖ Saída (remover)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={stockAdjustmentQty}
                  onChange={(e) => setStockAdjustmentQty(e.target.value)}
                  placeholder="0"
                />
                {stockAdjustmentQty && (
                  <p className="text-xs text-muted-foreground">
                    Novo estoque: {stockAdjustmentType === 'add' 
                      ? (selectedStockProduct.stock_quantity || 0) + (parseInt(stockAdjustmentQty) || 0)
                      : Math.max(0, (selectedStockProduct.stock_quantity || 0) - (parseInt(stockAdjustmentQty) || 0))
                    } un
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Input
                  value={stockAdjustmentReason}
                  onChange={(e) => setStockAdjustmentReason(e.target.value)}
                  placeholder="Ex: Compra de fornecedor, perda, etc."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockAdjustmentOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStockAdjustment} disabled={savingStock || !stockAdjustmentQty}>
              {savingStock ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
