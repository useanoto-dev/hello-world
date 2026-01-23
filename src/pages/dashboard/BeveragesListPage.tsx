// Beverages List Page - Professional full-screen drawer with animations
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, GlassWater, Search, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

interface BeverageType {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
}

interface BeverageProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  promotional_price: number | null;
  image_url: string | null;
  is_active: boolean;
  beverage_type_id: string;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
}

interface SortableProductRowProps {
  product: BeverageProduct;
  canDrag: boolean;
  onToggleActive: (product: BeverageProduct) => void;
  onEdit: (product: BeverageProduct) => void;
  onDelete: (product: BeverageProduct) => void;
  formatPrice: (price: number | null) => string;
}

function SortableProductRow({ product, canDrag, onToggleActive, onEdit, onDelete, formatPrice }: SortableProductRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasPromo = product.promotional_price && product.promotional_price < (product.price || 0);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:bg-muted/30 transition-colors bg-card",
        !product.is_active && "opacity-50",
        isDragging && "z-50"
      )}
    >
      {canDrag && (
        <td className="w-8 px-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </td>
      )}
      <td className="px-4 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md overflow-hidden bg-muted flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <GlassWater className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {product.name}
            </p>
            {product.description && (
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2 text-right">
        {hasPromo ? (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground line-through">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs font-medium text-green-600">
              {formatPrice(product.promotional_price)}
            </span>
          </div>
        ) : (
          <span className="text-xs font-medium text-foreground">
            {formatPrice(product.price)}
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-center">
          <Switch
            checked={product.is_active}
            onCheckedChange={() => onToggleActive(product)}
            className="scale-75 data-[state=checked]:bg-green-500"
          />
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(product)}
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(product)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function BeveragesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const selectedTypeId = searchParams.get('typeId');
  
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [beverageTypes, setBeverageTypes] = useState<BeverageType[]>([]);
  const [beverageProducts, setBeverageProducts] = useState<BeverageProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteProduct, setDeleteProduct] = useState<BeverageProduct | null>(null);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  // Auto-select first type if none selected
  useEffect(() => {
    if (!selectedTypeId && beverageTypes.length > 0 && !loading) {
      setSearchParams({ categoryId: categoryId || '', typeId: beverageTypes[0].id });
    }
  }, [beverageTypes, loading]);

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

      if (categoryId) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id, name")
          .eq("id", categoryId)
          .single();
        
        if (cat) setCategory(cat as Category);

        const { data: types } = await supabase
          .from("beverage_types")
          .select("id, name, icon, image_url")
          .eq("category_id", categoryId)
          .order("display_order");

        setBeverageTypes((types as BeverageType[]) || []);

        const { data: products } = await supabase
          .from("beverage_products")
          .select("id, name, description, price, promotional_price, image_url, is_active, beverage_type_id, display_order")
          .eq("category_id", categoryId)
          .order("display_order");

        setBeverageProducts((products as BeverageProduct[]) || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      navigate("/dashboard/products");
    }, 250);
  };

  const handleToggleActive = async (product: BeverageProduct) => {
    try {
      const { error } = await supabase
        .from("beverage_products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;

      setBeverageProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p)
      );

      toast.success(product.is_active ? "Bebida ocultada" : "Bebida visível");
    } catch (error: any) {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      const { error } = await supabase
        .from("beverage_products")
        .delete()
        .eq("id", deleteProduct.id);

      if (error) throw error;

      setBeverageProducts(prev => prev.filter(p => p.id !== deleteProduct.id));
      toast.success("Bebida excluída!");
      setDeleteProduct(null);
    } catch (error: any) {
      toast.error("Erro ao excluir");
    }
  };

  const handleSelectType = (typeId: string) => {
    setSearchParams({ categoryId: categoryId || '', typeId });
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "R$ 0,00";
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredProducts.findIndex(p => p.id === active.id);
    const newIndex = filteredProducts.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredProducts, oldIndex, newIndex);
    
    // Update local state immediately
    setBeverageProducts(prev => {
      const otherProducts = prev.filter(p => !reordered.some(r => r.id === p.id));
      return [...otherProducts, ...reordered.map((p, i) => ({ ...p, display_order: i }))];
    });

    // Persist to database
    try {
      const updates = reordered.map((product, index) => ({
        id: product.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("beverage_products")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Ordem atualizada!");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Erro ao atualizar ordem");
      loadData(); // Reload on error
    }
  };

  const filteredProducts = beverageProducts
    .filter(p => selectedTypeId ? p.beverage_type_id === selectedTypeId : true)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const selectedType = beverageTypes.find(t => t.id === selectedTypeId);
  
  const canDrag = !searchTerm; // Disable drag when searching

  return (
    <AnimatePresence mode="wait">
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Full screen drawer */}
      <motion.div
        key="drawer"
        initial={{ y: "100%" }}
        animate={{ y: isClosing ? "100%" : 0 }}
        exit={{ y: "100%" }}
        transition={{ 
          type: "spring", 
          damping: 30, 
          stiffness: 350,
          mass: 0.8
        }}
        className="fixed inset-x-0 bottom-0 top-0 z-50 bg-background flex flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card">
          {/* Handle bar - visual indicator for mobile */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleClose}
                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-foreground">
                  {category?.name || "Bebidas"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {beverageProducts.length} {beverageProducts.length === 1 ? 'item' : 'itens'} cadastrados
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleClose}
              className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors md:flex hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex">
              <div className="w-44 bg-card border-r border-border p-3 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="flex-1 p-4 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : (
            <>
              {/* Sidebar - Types */}
              <div className="w-44 bg-card border-r border-border flex flex-col flex-shrink-0">
                <div className="p-2 flex-1 overflow-y-auto">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
                    Tipos
                  </p>
                  
                  {beverageTypes.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2">Nenhum tipo</p>
                  ) : (
                    <div className="space-y-0.5">
                      {beverageTypes.map(type => {
                        const count = beverageProducts.filter(p => p.beverage_type_id === type.id).length;
                        const isActive = selectedTypeId === type.id;
                        
                        return (
                          <button
                            key={type.id}
                            onClick={() => handleSelectType(type.id)}
                            className={cn(
                              "w-full text-left px-2.5 py-2 rounded-md text-xs transition-all",
                              "flex items-center justify-between gap-2",
                              isActive 
                                ? "bg-primary text-primary-foreground font-medium" 
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <span className="truncate">{type.name}</span>
                            <span className={cn(
                              "text-[10px] tabular-nums",
                              isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-border">
                  <Button
                    onClick={() => navigate(`/dashboard/beverage/new?categoryId=${categoryId}${selectedTypeId ? `&typeId=${selectedTypeId}` : ''}`)}
                    size="sm"
                    className="w-full h-8 text-xs gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova
                  </Button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Sub Header */}
                <div className="bg-muted/30 border-b border-border px-4 py-2.5 flex items-center justify-between gap-4 flex-shrink-0">
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium text-foreground truncate">
                      {selectedType?.name || "Todos"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>

                  <div className="relative w-48 flex-shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Products List */}
                <div className="flex-1 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <GlassWater className="w-8 h-8 mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Nenhuma bebida</p>
                      <button
                        onClick={() => navigate(`/dashboard/beverage/new?categoryId=${categoryId}${selectedTypeId ? `&typeId=${selectedTypeId}` : ''}`)}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        + Adicionar bebida
                      </button>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <table className="w-full">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {canDrag && <th className="w-8"></th>}
                            <th className="text-left px-4 py-2 font-medium">Bebida</th>
                            <th className="text-right px-4 py-2 font-medium w-24">Preço</th>
                            <th className="text-center px-4 py-2 font-medium w-16">Ativo</th>
                            <th className="text-right px-4 py-2 font-medium w-20">Ações</th>
                          </tr>
                        </thead>
                        <SortableContext items={filteredProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                          <tbody className="divide-y divide-border">
                            {filteredProducts.map(product => (
                              <SortableProductRow
                                key={product.id}
                                product={product}
                                canDrag={canDrag}
                                onToggleActive={handleToggleActive}
                                onEdit={(p) => navigate(`/dashboard/beverage/edit?edit=${p.id}&categoryId=${categoryId}&from=beverages`)}
                                onDelete={setDeleteProduct}
                                formatPrice={formatPrice}
                              />
                            ))}
                          </tbody>
                        </SortableContext>
                      </table>
                    </DndContext>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bebida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A bebida "{deleteProduct?.name}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
}
