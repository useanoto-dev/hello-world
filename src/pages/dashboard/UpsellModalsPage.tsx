import { useState, useEffect } from "react";
import { Plus, Sparkles, Trash2, Edit2, ArrowRight, Circle, Coffee, Sandwich } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { toast } from "sonner";
import { UpsellModalEditor } from "@/components/admin/UpsellModalEditor";

interface Category {
  id: string;
  name: string;
  icon: string | null;
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
  edge: { label: "Borda", icon: "🍕", color: "bg-orange-100 text-orange-700 border-orange-200" },
  drink: { label: "Bebida", icon: "🥤", color: "bg-blue-100 text-blue-700 border-blue-200" },
  upsell: { label: "Venda adicional", icon: "✨", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

export default function UpsellModalsPage() {
  const { restaurantId } = useActiveRestaurant();
  const [modals, setModals] = useState<UpsellModal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingModal, setEditingModal] = useState<UpsellModal | null>(null);

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
        .select("id, name, icon")
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
    setEditingModal(modal);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingModal(null);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingModal(null);
    loadData();
  };

  const getTypeConfig = (type: string) => MODAL_TYPE_CONFIG[type] || MODAL_TYPE_CONFIG.upsell;

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
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Modais de Venda Adicional
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Configure modais para sugerir produtos durante o pedido
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
        <div className="grid gap-4 md:grid-cols-2">
          {modals.map((modal) => {
            const typeConfig = getTypeConfig(modal.modal_type);
            return (
              <Card key={modal.id} className={!modal.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
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
                    <Switch
                      checked={modal.is_active}
                      onCheckedChange={() => toggleModalActive(modal)}
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
                      onClick={() => handleEdit(modal)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => deleteModal(modal)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showEditor && (
        <UpsellModalEditor
          open={showEditor}
          onClose={handleEditorClose}
          modal={editingModal}
          categories={categories}
          storeId={restaurantId || ""}
        />
      )}
    </div>
  );
}
