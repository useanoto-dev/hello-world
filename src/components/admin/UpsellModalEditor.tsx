import { useState, useEffect } from "react";
import { Sparkles, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface UpsellModalEditorProps {
  open: boolean;
  onClose: () => void;
  modal: UpsellModal | null;
  categories: Category[];
  storeId: string;
}

const MODAL_TYPES = [
  { value: "upsell", label: "Venda adicional", icon: "✨", description: "Sugere produtos de outras categorias" },
  { value: "drink", label: "Sugestão de bebida", icon: "🥤", description: "Oferece bebidas após um item" },
  { value: "edge", label: "Borda de pizza", icon: "🍕", description: "Oferece bordas recheadas" },
];

export function UpsellModalEditor({
  open,
  onClose,
  modal,
  categories,
  storeId,
}: UpsellModalEditorProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    modal_type: "upsell",
    trigger_category_id: "",
    target_category_id: "",
    title: "Deseja mais alguma coisa?",
    description: "Aproveite para completar seu pedido",
    is_active: true,
    show_quick_add: true,
    max_products: 4,
  });

  useEffect(() => {
    if (modal) {
      setFormData({
        name: modal.name,
        modal_type: modal.modal_type || "upsell",
        trigger_category_id: modal.trigger_category_id || "",
        target_category_id: modal.target_category_id || "",
        title: modal.title,
        description: modal.description || "",
        is_active: modal.is_active,
        show_quick_add: modal.show_quick_add,
        max_products: modal.max_products,
      });
    } else {
      setFormData({
        name: "",
        modal_type: "upsell",
        trigger_category_id: "",
        target_category_id: "",
        title: "Deseja mais alguma coisa?",
        description: "Aproveite para completar seu pedido",
        is_active: true,
        show_quick_add: true,
        max_products: 4,
      });
    }
  }, [modal]);

  // Auto-update title when type changes
  const handleTypeChange = (type: string) => {
    const typeConfig = MODAL_TYPES.find(t => t.value === type);
    let title = formData.title;
    let description = formData.description;

    if (!modal) {
      // Only auto-fill for new modals
      if (type === "drink") {
        title = "Que tal uma bebida?";
        description = "Complete seu pedido!";
      } else if (type === "edge") {
        title = "Escolha a Borda";
        description = "Deixe sua pizza ainda mais gostosa";
      } else {
        title = "Deseja mais alguma coisa?";
        description = "Aproveite para completar seu pedido";
      }
    }

    setFormData({ ...formData, modal_type: type, title, description });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Informe o nome do modal");
      return;
    }

    setSaving(true);

    try {
      const data = {
        store_id: storeId,
        name: formData.name.trim(),
        modal_type: formData.modal_type,
        trigger_category_id: formData.trigger_category_id || null,
        target_category_id: formData.target_category_id || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        show_quick_add: formData.show_quick_add,
        max_products: formData.max_products,
      };

      if (modal) {
        const { error } = await supabase
          .from("upsell_modals")
          .update(data)
          .eq("id", modal.id);

        if (error) throw error;
        toast.success("Modal atualizado!");
      } else {
        const { error } = await supabase
          .from("upsell_modals")
          .insert(data);

        if (error) throw error;
        toast.success("Modal criado!");
      }

      onClose();
    } catch (error) {
      console.error("Error saving modal:", error);
      toast.error("Erro ao salvar modal");
    } finally {
      setSaving(false);
    }
  };

  const selectedType = MODAL_TYPES.find(t => t.value === formData.modal_type);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {modal ? "Editar Modal" : "Novo Modal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Modal Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Modal</Label>
            <div className="grid grid-cols-3 gap-2">
              {MODAL_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    formData.modal_type === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <span className="text-2xl block mb-1">{type.icon}</span>
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
            {selectedType && (
              <p className="text-[10px] text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Trigger Category */}
          <div className="space-y-1.5">
            <Label className="text-xs">Aparece após comprar de</Label>
            <Select
              value={formData.trigger_category_id}
              onValueChange={(v) => setFormData({ ...formData, trigger_category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Qualquer categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Qualquer categoria</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon || "📦"}</span>
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              O modal aparecerá quando o cliente adicionar um item desta categoria
            </p>
          </div>

          {/* Target Category - only show for upsell and drink types */}
          {formData.modal_type !== "edge" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Sugerir produtos de</Label>
              <Select
                value={formData.target_category_id}
                onValueChange={(v) => setFormData({ ...formData, target_category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sugestões automáticas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sugestões automáticas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon || "📦"}</span>
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Produtos desta categoria serão sugeridos no modal
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">Título do Modal</Label>
            <Input
              id="title"
              placeholder="Deseja mais alguma coisa?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Aproveite para completar seu pedido"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2 border-t">
            {formData.modal_type !== "edge" && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Mostrar botão de adicionar rápido</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Permite adicionar produtos direto do modal
                    </p>
                  </div>
                  <Switch
                    checked={formData.show_quick_add}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, show_quick_add: checked })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Máximo de produtos exibidos</Label>
                  <Select
                    value={formData.max_products.toString()}
                    onValueChange={(v) => setFormData({ ...formData, max_products: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 produtos</SelectItem>
                      <SelectItem value="4">4 produtos</SelectItem>
                      <SelectItem value="6">6 produtos</SelectItem>
                      <SelectItem value="8">8 produtos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">Dica:</strong> Configure um modal de bebidas para aparecer após o cliente escolher uma pizza. Isso aumenta o ticket médio!
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : modal ? "Salvar" : "Criar Modal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
