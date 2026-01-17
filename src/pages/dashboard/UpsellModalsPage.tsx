import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, Trash2, Edit2, ArrowRight, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { toast } from "sonner";
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

interface Category {
  id: string;
  name: string;
  icon: string | null;
  category_type: string | null;
}

interface UpsellModal {
  id: string;
  name: string;
  modal_type: string;
  trigger_category_id: string | null;
  target_category_id: string | null;
  title: string;
  description: string | null;
  is_active: boolean;
  show_quick_add: boolean;
  max_products: number;
  display_order: number;
  trigger_category?: Category;
  target_category?: Category;
}

const MODAL_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  drink: { label: "Bebidas", icon: "🥤", color: "bg-blue-100 text-blue-700 border-blue-200" },
  edge: { label: "Bordas", icon: "🍕", color: "bg-orange-100 text-orange-700 border-orange-200" },
  additional: { label: "Adicionais", icon: "➕", color: "bg-green-100 text-green-700 border-green-200" },
  accompaniment: { label: "Acompanhamentos", icon: "🍟", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  custom: { label: "Personalizado", icon: "✨", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

interface SortableModalCardProps {
  modal: UpsellModal;
  typeConfig: { label: string; icon: string; color: string };
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  orderNumber: number;
}

function SortableModalCard({ modal, typeConfig, onToggle, onEdit, onDelete, orderNumber }: SortableModalCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: modal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`${!modal.is_active ? "opacity-60" : ""} ${isDragging ? "ring-2 ring-primary" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded touch-none"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            {/* Order badge */}
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{orderNumber}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{typeConfig.icon}</span>
                <CardTitle className="text-sm font-medium">
                  {modal.name}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${typeConfig.color}`}>
                  {typeConfig.label}
                </Badge>
                <Badge variant={modal.is_active ? "default" : "secondary"} className="text-[10px]">
                  {modal.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </div>
          <Switch
            checked={modal.is_active}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Title preview */}
        <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs font-medium text-foreground">{modal.title}</p>
          {modal.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{modal.description}</p>
          )}
        </div>

        {/* Flow visualization */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-lg">{modal.trigger_category?.icon || "📦"}</span>
            <span className="text-xs font-medium truncate">
              {modal.trigger_category?.name || "Qualquer categoria"}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-lg">{modal.target_category?.icon || typeConfig.icon}</span>
            <span className="text-xs font-medium truncate">
              {modal.target_category?.name || "Sugestões automáticas"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onEdit}
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UpsellModalsPage() {
  const navigate = useNavigate();
  const { restaurantId } = useActiveRestaurant();
  const [modals, setModals] = useState<UpsellModal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (restaurantId) {
      loadData();
    }
  }, [restaurantId]);

  const loadData = async () => {
    if (!restaurantId) return;
    
    try {
      // Load categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, icon, category_type")
        .eq("store_id", restaurantId)
        .eq("is_active", true)
        .order("display_order");

      setCategories(categoriesData || []);

      // Load modals
      const { data: modalsData, error } = await supabase
        .from("upsell_modals")
        .select("*")
        .eq("store_id", restaurantId)
        .order("display_order");

      if (error) throw error;

      // Map category names
      const modalsWithCategories = (modalsData || []).map(modal => ({
        ...modal,
        trigger_category: categoriesData?.find(c => c.id === modal.trigger_category_id),
        target_category: categoriesData?.find(c => c.id === modal.target_category_id),
      }));

      setModals(modalsWithCategories);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar modais");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = modals.findIndex((m) => m.id === active.id);
    const newIndex = modals.findIndex((m) => m.id === over.id);
    
    const newModals = arrayMove(modals, oldIndex, newIndex);
    setModals(newModals);

    // Update display_order in database
    try {
      const updates = newModals.map((modal, index) => ({
        id: modal.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("upsell_modals")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Ordem dos modais atualizada");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Erro ao atualizar ordem");
      loadData(); // Reload on error
    }
  };

  const toggleModalActive = async (modal: UpsellModal) => {
    try {
      const { error } = await supabase
        .from("upsell_modals")
        .update({ is_active: !modal.is_active })
        .eq("id", modal.id);

      if (error) throw error;

      setModals(prev => prev.map(m => 
        m.id === modal.id ? { ...m, is_active: !m.is_active } : m
      ));
      
      toast.success(modal.is_active ? "Modal desativado" : "Modal ativado");
    } catch (error) {
      console.error("Error toggling modal:", error);
      toast.error("Erro ao atualizar modal");
    }
  };

  const deleteModal = async (modal: UpsellModal) => {
    if (!confirm(`Deseja excluir o modal "${modal.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("upsell_modals")
        .delete()
        .eq("id", modal.id);

      if (error) throw error;

      setModals(prev => prev.filter(m => m.id !== modal.id));
      toast.success("Modal excluído");
    } catch (error) {
      console.error("Error deleting modal:", error);
      toast.error("Erro ao excluir modal");
    }
  };

  const handleEdit = (modal: UpsellModal) => {
    navigate(`/dashboard/upsell-modal/edit?edit=${modal.id}`);
  };

  const handleCreate = () => {
    navigate("/dashboard/upsell-modal/new");
  };

  const getTypeConfig = (type: string) => MODAL_TYPE_CONFIG[type] || MODAL_TYPE_CONFIG.custom;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">
            Modais de Venda Adicional
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Arraste para definir a ordem em que os modais aparecem
          </p>
        </div>
        <Button size="sm" onClick={handleCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Novo Modal
        </Button>
      </div>

      {modals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Sparkles className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-sm mb-1">Nenhum modal configurado</h3>
            <p className="text-muted-foreground text-xs text-center max-w-xs mb-4">
              Crie modais para sugerir bebidas após pizza, sobremesas após refeição, etc.
            </p>
            <Button size="sm" onClick={handleCreate} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Criar Primeiro Modal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={modals.map(m => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {modals.map((modal, index) => {
                const typeConfig = getTypeConfig(modal.modal_type);
                return (
                  <SortableModalCard
                    key={modal.id}
                    modal={modal}
                    typeConfig={typeConfig}
                    orderNumber={index + 1}
                    onToggle={() => toggleModalActive(modal)}
                    onEdit={() => handleEdit(modal)}
                    onDelete={() => deleteModal(modal)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}