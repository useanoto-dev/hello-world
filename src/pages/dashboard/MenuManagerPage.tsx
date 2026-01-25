// Menu Manager Page - Enterprise-grade with prefetching
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  Settings2,
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
import { ProductOptionGroupsManager } from "@/components/admin/ProductOptionGroupsManager";
import { StandardItemWizard } from "@/components/admin/StandardItemWizard";

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
  display_mode?: string;
  category_id?: string;
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

interface StandardSize {
  id: string;
  name: string;
  base_price: number;
  description: string | null;
  is_active: boolean;
}

interface StandardItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  item_type: string;
  is_premium: boolean;
  is_active: boolean;
}

interface OptionGroup {
  id: string;
  name: string;
  min_selections: number | null;
  max_selections: number | null;
  is_required: boolean | null;
  items_count?: number;
}

export default function MenuManagerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("categories");

  // Prefetch beverage data for instant navigation
  const prefetchBeverageData = useCallback(async (categoryId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ["beverages-list", categoryId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile } = await supabase
          .from("profiles")
          .select("store_id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.store_id) throw new Error("No store");

        const [categoryRes, typesRes, productsRes] = await Promise.all([
          supabase.from("categories").select("id, name").eq("id", categoryId).maybeSingle(),
          supabase.from("beverage_types").select("id, name, icon, image_url").eq("category_id", categoryId).order("display_order"),
          supabase.from("beverage_products").select("id, name, description, price, promotional_price, image_url, is_active, beverage_type_id, display_order").eq("category_id", categoryId).order("display_order"),
        ]);

        return {
          category: categoryRes.data,
          beverageTypes: typesRes.data || [],
          beverageProducts: productsRes.data || [],
        };
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
  
  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [categoryPizzaSizes, setCategoryPizzaSizes] = useState<Record<string, PizzaSize[]>>({});
  const [categoryPizzaFlavors, setCategoryPizzaFlavors] = useState<Record<string, PizzaFlavor[]>>({});
  const [categoryStandardSizes, setCategoryStandardSizes] = useState<Record<string, StandardSize[]>>({});
  const [categoryStandardItems, setCategoryStandardItems] = useState<Record<string, StandardItem[]>>({});
  const [categoryOptionGroups, setCategoryOptionGroups] = useState<Record<string, OptionGroup[]>>({});
  const [categoryBeverageTypes, setCategoryBeverageTypes] = useState<Record<string, { id: string; name: string }[]>>({});
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
  
  // Product options modal state
  const [showOptionsManager, setShowOptionsManager] = useState(false);
  const [selectedOptionsProduct, setSelectedOptionsProduct] = useState<{
    productId: string;
    productName: string;
    categoryId: string;
  } | null>(null);
  
  // Standard item wizard state
  const [showStandardItemWizard, setShowStandardItemWizard] = useState(false);
  const [standardItemCategoryId, setStandardItemCategoryId] = useState<string | null>(null);
  

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
      } else if (categoryType === 'standard' || categoryType === 'beverages') {
        // For standard categories (açaí, hambúrguer, etc.) AND beverages, load sizes, items, option groups, and beverage types
        const [sizesResult, itemsResult, groupsResult, beverageTypesResult] = await Promise.all([
          supabase
            .from("standard_sizes")
            .select("id, name, base_price, description, is_active")
            .eq("category_id", categoryId)
            .order("display_order"),
          supabase
            .from("standard_items")
            .select("id, name, description, image_url, item_type, is_premium, is_active")
            .eq("category_id", categoryId)
            .order("display_order"),
          supabase
            .from("category_option_groups")
            .select("id, name, min_selections, max_selections, is_required")
            .eq("category_id", categoryId)
            .order("display_order"),
          supabase
            .from("beverage_types")
            .select("id, name")
            .eq("category_id", categoryId)
            .eq("is_active", true)
            .order("display_order")
        ]);
        
        // Get items count for each group
        const groupsWithCount = await Promise.all(
          (groupsResult.data || []).map(async (group: any) => {
            const { count } = await supabase
              .from("category_option_items")
              .select("*", { count: 'exact', head: true })
              .eq("group_id", group.id);
            return { ...group, items_count: count || 0 };
          })
        );
        
        setCategoryStandardSizes(prev => ({
          ...prev,
          [categoryId]: (sizesResult.data as StandardSize[]) || []
        }));
        
        setCategoryStandardItems(prev => ({
          ...prev,
          [categoryId]: (itemsResult.data as StandardItem[]) || []
        }));
        
        setCategoryOptionGroups(prev => ({
          ...prev,
          [categoryId]: groupsWithCount as OptionGroup[]
        }));
        
        setCategoryBeverageTypes(prev => ({
          ...prev,
          [categoryId]: (beverageTypesResult.data || []) as { id: string; name: string }[]
        }));
      } else {
        // For regular categories, load products
        const { data: products } = await supabase
          .from("products")
          .select("id, name, description, price, promotional_price, image_url, is_available, is_featured, has_stock_control, stock_quantity, min_stock_alert, display_mode, category_id")
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
        // Load products/sizes when expanding based on category type
        if (categoryType === 'pizza') {
          if (!categoryPizzaSizes[categoryId]) {
            loadCategoryProducts(categoryId, categoryType);
          }
        } else if (categoryType === 'standard') {
          if (!categoryStandardSizes[categoryId]) {
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
      // Open the MenuItemWizard modal
      setPreselectedCategoryId(categoryId || null);
      setShowItemWizard(true);
    }
  };
  
  const openAddItemTypeModal = (categoryId: string, categoryName: string, isPizza?: boolean, isStandard?: boolean) => {
    if (isPizza) {
      // For pizza categories, go directly to pizza flavor wizard
      navigate(`/dashboard/pizza-flavor/new?categoryId=${categoryId}`);
    } else if (isStandard) {
      // For standard categories (açaí, hambúrguer), open the standard item wizard
      setStandardItemCategoryId(categoryId);
      setShowStandardItemWizard(true);
    } else {
      // For regular categories, open the MenuItemWizard modal
      setPreselectedCategoryId(categoryId);
      setShowItemWizard(true);
    }
  };
  
  const handleAddToProduct = (product: { id: string; name: string; categoryId: string }) => {
    // Open the product options manager for this product
    setSelectedOptionsProduct({
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
    });
    setShowOptionsManager(true);
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
        display_mode: itemData.displayMode || 'direct',
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
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Cardápio</h1>
          <p className="text-[10px] text-muted-foreground/70">
            {categories.length} categorias
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Compact Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-40 pl-8 text-xs bg-muted/30 border-0 focus-visible:ring-1"
            />
          </div>
          
          {/* Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem 
                onClick={() => {
                  const allIds = new Set(categories.map(c => c.id));
                  setExpandedCategories(allIds);
                  categories.forEach(cat => {
                    if (!categoryProducts[cat.id]) {
                      loadCategoryProducts(cat.id, cat.category_type);
                    }
                  });
                }}
                className="text-xs"
              >
                Expandir todas
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setExpandedCategories(new Set())}
                className="text-xs"
              >
                Recolher todas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={() => openCategoryPage()} 
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Categoria
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
          <div className="space-y-2">
            {filteredCategories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                id={category.id}
                isActive={category.is_active}
              >
                {/* Promo Badge - Subtle */}
                {category.description && (
                  <div className="bg-amber-400/10 border-b border-amber-200/50 text-center py-0.5">
                    <span className="text-[9px] font-medium text-amber-600 uppercase tracking-wider">Promoção</span>
                  </div>
                )}
                
                {/* Compact Category Row */}
                <div className="bg-card px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <DragHandleButton id={category.id} />
                
                    {/* Category Info - Compact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {category.icon && <span className="text-sm">{category.icon}</span>}
                        <h3 className="font-medium text-sm text-foreground truncate">{category.name}</h3>
                        {!category.is_active && (
                          <span className="text-[9px] text-muted-foreground/70 uppercase">inativo</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60">
                        {category.category_type === 'pizza' ? 'Pizza' : category.category_type === 'standard' ? 'Padrão' : 'Produtos'}
                      </span>
                    </div>
                  
                    {/* Compact Actions */}
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openCategoryPage(category)} className="text-xs gap-2">
                            <Pencil className="w-3 h-3" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateCategory(category)} className="text-xs gap-2">
                            <Copy className="w-3 h-3" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCategory(category)}
                            className="text-xs gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleCategory(category.id, category.category_type)}
                      >
                        {expandedCategories.has(category.id) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {expandedCategories.has(category.id) && (
                  <div className="px-3 pb-3 pt-1">
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
                  ) : category.category_type === 'standard' || category.category_type === 'beverages' ? (
                    // Standard/Beverages Category Content - Clean organized layout
                    <div className="space-y-4 p-3 bg-muted/20 rounded-lg border border-border/30">
                      {/* Section Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-border/50">
                        <h4 className="font-medium text-foreground text-sm">
                          {category.category_type === 'beverages' ? 'Tipos de Bebidas' : 'Estrutura da Categoria'}
                        </h4>
                        <div className="flex items-center gap-2">
                          {/* Show "Cadastrar Bebidas" and "Ver bebidas" buttons if category has beverage types */}
                          {categoryBeverageTypes[category.id]?.length > 0 && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => navigate(`/dashboard/beverage/new?categoryId=${category.id}`)}
                                className="gap-1.5 h-7 text-xs"
                              >
                                <Plus className="w-3 h-3" />
                                Cadastrar Bebidas
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/dashboard/beverages?categoryId=${category.id}`)}
                                onMouseEnter={() => prefetchBeverageData(category.id)}
                                onFocus={() => prefetchBeverageData(category.id)}
                                onTouchStart={() => prefetchBeverageData(category.id)}
                                className="gap-1.5 h-7 text-xs active:scale-95 transition-transform"
                              >
                                Ver bebidas
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Beverage Types Section - Show for beverages category */}
                      {categoryBeverageTypes[category.id]?.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tipos</span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {categoryBeverageTypes[category.id].length}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {categoryBeverageTypes[category.id].map((type) => (
                              <button
                                key={type.id}
                                onClick={() => navigate(`/dashboard/beverages?categoryId=${category.id}&typeId=${type.id}`)}
                                onMouseEnter={() => prefetchBeverageData(category.id)}
                                onFocus={() => prefetchBeverageData(category.id)}
                                onTouchStart={() => prefetchBeverageData(category.id)}
                                className="inline-flex items-center gap-2 bg-card hover:bg-muted rounded-md border border-border/50 hover:border-primary/30 px-2.5 py-1.5 text-xs transition-all cursor-pointer active:scale-95"
                              >
                                <span className="font-medium text-foreground">{type.name}</span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sizes Section - only for standard categories */}
                      {category.category_type === 'standard' && categoryStandardSizes[category.id]?.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tamanhos</span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {categoryStandardSizes[category.id].length}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {categoryStandardSizes[category.id].map((size) => (
                              <div 
                                key={size.id}
                                className={cn(
                                  "inline-flex items-center gap-2 bg-card rounded-md border border-border/50 px-2.5 py-1.5 text-xs transition-all hover:border-border",
                                  !size.is_active && "opacity-40"
                                )}
                              >
                                <span className="font-medium text-foreground">{size.name}</span>
                                <span className="text-muted-foreground/70">
                                  R$ {size.base_price.toFixed(2).replace('.', ',')}
                                </span>
                                <Switch
                                  checked={size.is_active}
                                  onCheckedChange={async (checked) => {
                                    try {
                                      await supabase
                                        .from("standard_sizes")
                                        .update({ is_active: checked })
                                        .eq("id", size.id);
                                      
                                      setCategoryStandardSizes(prev => ({
                                        ...prev,
                                        [category.id]: prev[category.id].map(s =>
                                          s.id === size.id ? { ...s, is_active: checked } : s
                                        )
                                      }));
                                    } catch (error) {
                                      toast.error("Erro ao atualizar status");
                                    }
                                  }}
                                  className="data-[state=checked]:bg-green-500 scale-75"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Access Buttons - Personalizações */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Personalizações</span>
                        
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => navigate(`/dashboard/category/edit?edit=${category.id}&step=4`)}
                            className="inline-flex items-center gap-1.5 bg-card hover:bg-muted rounded-md border border-border/50 hover:border-primary/30 px-3 py-2 text-xs transition-all cursor-pointer"
                          >
                            <span className="font-medium text-foreground">🌡️ Temperatura</span>
                          </button>
                          <button
                            onClick={() => navigate(`/dashboard/category/edit?edit=${category.id}&step=4`)}
                            className="inline-flex items-center gap-1.5 bg-card hover:bg-muted rounded-md border border-border/50 hover:border-primary/30 px-3 py-2 text-xs transition-all cursor-pointer"
                          >
                            <span className="font-medium text-foreground">➕ Adicionais</span>
                          </button>
                        </div>
                      </div>

                      {/* Empty state for beverages */}
                      {category.category_type === 'beverages' && !categoryBeverageTypes[category.id]?.length && (
                        <div className="text-center py-4 bg-muted/30 rounded-lg">
                          <p className="text-muted-foreground text-sm">Nenhum tipo de bebida cadastrado</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate(`/dashboard/category/edit?edit=${category.id}&step=3`)}
                            className="mt-1 text-xs"
                          >
                            Adicionar tipos
                          </Button>
                        </div>
                      )}
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
                              "group bg-card rounded-xl overflow-hidden border border-border transition-all duration-200 ease-out hover:shadow-lg hover:border-primary/30",
                              !product.is_available && "opacity-60"
                            )}
                          >
                            {/* Product Image - Aspect 4/3 como Base44 */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
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
                                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground shadow-sm">
                                  Esgotado
                                </div>
                              )}
                              
                              {/* Customization Badge - Top Right */}
                              {product.display_mode === 'customization' && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white shadow-sm">
                                  <Settings2 className="w-3 h-3" />
                                  Personalização
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
                                    <DropdownMenuItem 
                                      onClick={() => navigate(`/dashboard/item/new?categoryId=${category.id}&edit=${product.id}`)}
                                      className="gap-2 text-sm"
                                    >
                                      <Pencil className="w-4 h-4" />
                                      Editar item
                                    </DropdownMenuItem>
                                    {product.display_mode === 'customization' && (
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedOptionsProduct({
                                            productId: product.id,
                                            productName: product.name,
                                            categoryId: category.id,
                                          });
                                          setShowOptionsManager(true);
                                        }}
                                        className="gap-2 text-sm text-blue-600"
                                      >
                                        <Settings2 className="w-4 h-4" />
                                        Personalização
                                      </DropdownMenuItem>
                                    )}
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
                                      className="gap-2 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
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
                              <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                                {product.name}
                              </h3>
                              
                              {product.description && (
                                <p className="text-muted-foreground text-xs line-clamp-1 mt-1">
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
                                    className="text-[10px] text-primary hover:underline"
                                  >
                                    Ajustar
                                  </button>
                                </div>
                              )}
                              
                              {/* Price and Toggle */}
                              <div className="mt-2 flex items-center justify-between">
                                <Popover 
                                  open={editingPriceId === product.id}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setEditingPriceId(product.id);
                                      setEditingPriceValue(displayPrice.toFixed(2));
                                    } else {
                                      setEditingPriceId(null);
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <button className="flex items-center gap-1 cursor-pointer hover:opacity-80">
                                      {hasPromo && (
                                        <span className="text-xs text-muted-foreground line-through">
                                          R$ {product.price.toFixed(2).replace('.', ',')}
                                        </span>
                                      )}
                                      <span className={cn(
                                        "font-bold text-sm",
                                        hasPromo ? "text-green-600" : "text-foreground"
                                      )}>
                                        R$ {displayPrice.toFixed(2).replace('.', ',')}
                                      </span>
                                      <Pencil className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-3" align="start">
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-xs font-medium text-muted-foreground">Novo preço</label>
                                        <div className="flex gap-2 mt-1">
                                          <Input
                                            type="text"
                                            value={editingPriceValue}
                                            onChange={(e) => setEditingPriceValue(e.target.value)}
                                            className="h-8 text-sm"
                                            autoFocus
                                          />
                                        </div>
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
                      <p className="text-lg font-medium text-foreground">Nenhum item</p>
                      <p className="text-muted-foreground text-sm">Adicione itens a esta categoria</p>
                    </div>
                  )}
                  
                  {/* Add Item Button - Compact (only for non-beverage categories) */}
                  {category.category_type !== 'beverages' && !categoryBeverageTypes[category.id]?.length && (
                    <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-3">
                      <button 
                        onClick={() => {
                          openAddItemTypeModal(
                            category.id, 
                            category.name, 
                            category.category_type === 'pizza',
                            category.category_type === 'standard'
                          );
                        }}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium text-xs transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {category.category_type === 'pizza' ? 'Adicionar Sabor' : 'Adicionar Item'}
                      </button>
                      {category.category_type === 'pizza' && (
                        <button 
                          onClick={() => navigate(`/dashboard/pizza-flavors?categoryId=${category.id}`)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Ver sabores
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
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

      {/* Standard Item Wizard */}
      {storeId && standardItemCategoryId && (
        <StandardItemWizard
          open={showStandardItemWizard}
          onOpenChange={setShowStandardItemWizard}
          categoryId={standardItemCategoryId}
          storeId={storeId}
          onSave={() => {
            // Reload standard items for this category
            loadCategoryProducts(standardItemCategoryId, 'standard');
          }}
        />
      )}

    </div>
  );
}
