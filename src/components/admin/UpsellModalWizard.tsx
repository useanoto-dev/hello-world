import { useState, useEffect } from "react";
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Palette
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  button_text?: string | null;
  button_color?: string | null;
  secondary_button_text?: string | null;
  icon?: string | null;
}

interface UpsellModalWizardProps {
  open: boolean;
  onClose: () => void;
  modal: UpsellModal | null;
  categories: Category[];
  storeId: string;
}

// Templates pré-definidos com configurações completas
const MODAL_TEMPLATES = [
  { 
    id: "drink", 
    label: "Bebidas", 
    icon: "🥤", 
    color: "bg-emerald-500",
    description: "Sugere bebidas após adicionar um item",
    defaultTitle: "Que tal uma bebida gelada? 😎",
    defaultDescription: "Complete sua experiência com uma bebida refrescante!",
    defaultButtonText: "Escolher Bebida",
    defaultButtonColor: "#22c55e",
    defaultSecondaryText: "Sem Bebida",
    defaultIcon: "🥤",
  },
  { 
    id: "edge", 
    label: "Bordas", 
    icon: "🍕", 
    color: "bg-orange-500",
    description: "Oferece bordas recheadas para pizzas",
    defaultTitle: "Quer deixar sua pizza ainda melhor? 🍕",
    defaultDescription: "Escolha uma borda recheada deliciosa!",
    defaultButtonText: "Escolher Borda",
    defaultButtonColor: "#f97316",
    defaultSecondaryText: "Sem Borda",
    defaultIcon: "🧀",
  },
  { 
    id: "additional", 
    label: "Adicionais", 
    icon: "➕", 
    color: "bg-blue-500",
    description: "Sugere itens adicionais ao produto",
    defaultTitle: "Deseja adicionar algo mais? ✨",
    defaultDescription: "Turbine seu pedido com ingredientes extras!",
    defaultButtonText: "Ver Adicionais",
    defaultButtonColor: "#3b82f6",
    defaultSecondaryText: "Não, obrigado",
    defaultIcon: "➕",
  },
  { 
    id: "accompaniment", 
    label: "Acompanhamentos", 
    icon: "🍟", 
    color: "bg-amber-500",
    description: "Sugere acompanhamentos como batatas, molhos",
    defaultTitle: "Que tal um acompanhamento? 🍟",
    defaultDescription: "Batatas, molhos e muito mais para você!",
    defaultButtonText: "Ver Acompanhamentos",
    defaultButtonColor: "#eab308",
    defaultSecondaryText: "Sem Acompanhamento",
    defaultIcon: "🍟",
  },
  { 
    id: "custom", 
    label: "Personalizado", 
    icon: "✨", 
    color: "bg-purple-500",
    description: "Crie um modal totalmente personalizado",
    defaultTitle: "Deseja mais alguma coisa? 🎉",
    defaultDescription: "Aproveite para completar seu pedido!",
    defaultButtonText: "Ver Opções",
    defaultButtonColor: "#a855f7",
    defaultSecondaryText: "Não, obrigado",
    defaultIcon: "✨",
  },
];

// Cores pré-definidas para seleção rápida
const BUTTON_COLORS = [
  { value: "#22c55e", label: "Verde", class: "bg-green-500" },
  { value: "#3b82f6", label: "Azul", class: "bg-blue-500" },
  { value: "#f97316", label: "Laranja", class: "bg-orange-500" },
  { value: "#ef4444", label: "Vermelho", class: "bg-red-500" },
  { value: "#a855f7", label: "Roxo", class: "bg-purple-500" },
  { value: "#eab308", label: "Amarelo", class: "bg-yellow-500" },
  { value: "#ec4899", label: "Rosa", class: "bg-pink-500" },
  { value: "#14b8a6", label: "Teal", class: "bg-teal-500" },
];

type WizardStep = "template" | "categories" | "settings";

export function UpsellModalWizard({
  open,
  onClose,
  modal,
  categories,
  storeId,
}: UpsellModalWizardProps) {
  const [step, setStep] = useState<WizardStep>("template");
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    title: "Deseja mais alguma coisa? 🎉",
    description: "Aproveite para completar seu pedido!",
    target_category_id: "",
    is_active: true,
    show_quick_add: true,
    max_products: 4,
    button_text: "Ver Opções",
    button_color: "#22c55e",
    secondary_button_text: "Não, obrigado",
    icon: "✨",
  });

  // Initialize for editing
  useEffect(() => {
    if (modal) {
      setSelectedTemplate(modal.modal_type || "custom");
      setSelectedCategories(modal.trigger_category_id ? [modal.trigger_category_id] : []);
      setFormData({
        name: modal.name,
        title: modal.title,
        description: modal.description || "",
        target_category_id: modal.target_category_id || "",
        is_active: modal.is_active,
        show_quick_add: modal.show_quick_add,
        max_products: modal.max_products,
        button_text: modal.button_text || "Ver Opções",
        button_color: modal.button_color || "#22c55e",
        secondary_button_text: modal.secondary_button_text || "Não, obrigado",
        icon: modal.icon || "✨",
      });
      // Go to settings when editing
      setStep("settings");
    } else {
      // Reset for new modal
      setStep("template");
      setSelectedTemplate("custom");
      setSelectedCategories([]);
      setFormData({
        name: "",
        title: "Deseja mais alguma coisa? 🎉",
        description: "Aproveite para completar seu pedido!",
        target_category_id: "",
        is_active: true,
        show_quick_add: true,
        max_products: 4,
        button_text: "Ver Opções",
        button_color: "#22c55e",
        secondary_button_text: "Não, obrigado",
        icon: "✨",
      });
    }
  }, [modal, open]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = MODAL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.label,
        title: template.defaultTitle,
        description: template.defaultDescription,
        button_text: template.defaultButtonText,
        button_color: template.defaultButtonColor,
        secondary_button_text: template.defaultSecondaryText,
        icon: template.defaultIcon,
      }));
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNext = () => {
    if (step === "template") {
      setStep("categories");
    } else if (step === "categories") {
      setStep("settings");
    }
  };

  const handleBack = () => {
    if (step === "settings") {
      setStep("categories");
    } else if (step === "categories") {
      setStep("template");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Informe o nome do modal");
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error("Selecione ao menos uma categoria");
      return;
    }

    setSaving(true);

    try {
      const data = {
        store_id: storeId,
        name: formData.name.trim(),
        modal_type: selectedTemplate,
        trigger_category_id: selectedCategories[0] || null,
        target_category_id: formData.target_category_id || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        show_quick_add: formData.show_quick_add,
        max_products: formData.max_products,
        button_text: formData.button_text.trim(),
        button_color: formData.button_color,
        secondary_button_text: formData.secondary_button_text.trim(),
        icon: formData.icon,
      };

      if (modal) {
        const { error } = await supabase
          .from("upsell_modals")
          .update(data)
          .eq("id", modal.id);

        if (error) throw error;
        toast.success("Modal atualizado!");
      } else {
        // If multiple categories selected, create one modal per category
        if (selectedCategories.length === 1) {
          const { error } = await supabase
            .from("upsell_modals")
            .insert(data);
          if (error) throw error;
        } else {
          // Create multiple modals
          const modalsToCreate = selectedCategories.map((catId, index) => ({
            ...data,
            trigger_category_id: catId,
            name: `${formData.name.trim()} - ${categories.find(c => c.id === catId)?.name || index + 1}`,
          }));
          
          const { error } = await supabase
            .from("upsell_modals")
            .insert(modalsToCreate);
          if (error) throw error;
        }
        toast.success(`Modal${selectedCategories.length > 1 ? 's' : ''} criado${selectedCategories.length > 1 ? 's' : ''}!`);
      }

      onClose();
    } catch (error) {
      console.error("Error saving modal:", error);
      toast.error("Erro ao salvar modal");
    } finally {
      setSaving(false);
    }
  };

  const currentTemplate = MODAL_TEMPLATES.find(t => t.id === selectedTemplate);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {["template", "categories", "settings"].map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
            step === s 
              ? "bg-primary text-primary-foreground" 
              : ["template", "categories", "settings"].indexOf(step) > i
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
          )}>
            {["template", "categories", "settings"].indexOf(step) > i ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              i + 1
            )}
          </div>
          {i < 2 && (
            <div className={cn(
              "w-8 h-0.5 mx-1",
              ["template", "categories", "settings"].indexOf(step) > i 
                ? "bg-primary/50" 
                : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  const renderTemplateStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="font-medium text-sm">Escolha o tipo de modal</h3>
        <p className="text-xs text-muted-foreground">Selecione um modelo pré-pronto ou crie um personalizado</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MODAL_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleTemplateSelect(template.id)}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              selectedTemplate === template.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg",
                template.color
              )}>
                {template.icon}
              </div>
              <span className="font-medium text-sm">{template.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCategoriesStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="font-medium text-sm">Onde o modal aparece?</h3>
        <p className="text-xs text-muted-foreground">
          Selecione as categorias que disparam este modal
        </p>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 border border-border/50 flex items-center gap-2">
        <span className="text-lg">{currentTemplate?.icon}</span>
        <span className="text-sm font-medium">{currentTemplate?.label}</span>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {categories.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhuma categoria ativa no cardápio
          </div>
        ) : (
          categories.map((category) => (
            <label
              key={category.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                selectedCategories.includes(category.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <span className="text-lg">{category.icon || "📦"}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{category.name}</span>
                {category.category_type && (
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {category.category_type}
                  </span>
                )}
              </div>
            </label>
          ))
        )}
      </div>

      {selectedCategories.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {selectedCategories.length} categoria{selectedCategories.length > 1 ? 's' : ''} selecionada{selectedCategories.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="font-medium text-sm">Personalize o modal</h3>
        <p className="text-xs text-muted-foreground">Configure o conteúdo e aparência</p>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="text-center">
          <span className="text-3xl mb-2 block">{formData.icon}</span>
          <h4 className="font-semibold text-sm">{formData.title || "Título do modal"}</h4>
          <p className="text-xs text-muted-foreground mt-1">{formData.description || "Descrição"}</p>
          <div className="mt-3 space-y-2">
            <button 
              className="w-full py-2 rounded-lg text-white text-xs font-medium"
              style={{ backgroundColor: formData.button_color }}
            >
              + {formData.button_text}
            </button>
            <button className="w-full py-2 rounded-lg border border-border text-xs font-medium">
              {formData.secondary_button_text}
            </button>
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs">Nome do Modal (interno)</Label>
        <Input
          id="name"
          placeholder="Ex: Bebidas após Pizza"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      {/* Icon */}
      <div className="space-y-1.5">
        <Label htmlFor="icon" className="text-xs">Ícone (emoji)</Label>
        <Input
          id="icon"
          placeholder="🥤"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          className="text-lg"
          maxLength={4}
        />
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-xs">Título exibido</Label>
        <Input
          id="title"
          placeholder="Que tal uma bebida gelada? 😎"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Complete sua experiência com uma bebida refrescante!"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      {/* Button Text */}
      <div className="space-y-1.5">
        <Label htmlFor="button_text" className="text-xs">Texto do botão principal</Label>
        <Input
          id="button_text"
          placeholder="Escolher Bebida"
          value={formData.button_text}
          onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
        />
      </div>

      {/* Button Color */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <Palette className="w-3 h-3" />
          Cor do botão
        </Label>
        <div className="flex flex-wrap gap-2">
          {BUTTON_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setFormData({ ...formData, button_color: color.value })}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all",
                color.class,
                formData.button_color === color.value
                  ? "border-foreground scale-110 ring-2 ring-primary/30"
                  : "border-transparent hover:scale-105"
              )}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Secondary Button Text */}
      <div className="space-y-1.5">
        <Label htmlFor="secondary_button_text" className="text-xs">Texto do botão secundário</Label>
        <Input
          id="secondary_button_text"
          placeholder="Sem Bebida"
          value={formData.secondary_button_text}
          onChange={(e) => setFormData({ ...formData, secondary_button_text: e.target.value })}
        />
      </div>

      {/* Target Category - for drink/custom */}
      {(selectedTemplate === "drink" || selectedTemplate === "custom" || selectedTemplate === "accompaniment") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Sugerir produtos de</Label>
          <Select
            value={formData.target_category_id || "auto"}
            onValueChange={(v) => setFormData({ ...formData, target_category_id: v === "auto" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sugestões automáticas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Sugestões automáticas</SelectItem>
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
        </div>
      )}

      {/* Settings */}
      <div className="space-y-3 pt-3 border-t">
        {selectedTemplate !== "edge" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Adicionar rápido</Label>
                <p className="text-[10px] text-muted-foreground">
                  Permite adicionar direto do modal
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
              <Label className="text-xs">Máximo de produtos</Label>
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

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Ativar modal</Label>
            <p className="text-[10px] text-muted-foreground">
              Desative para pausar
            </p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, is_active: checked })
            }
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {modal ? "Editar Modal" : "Novo Modal"}
          </DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        {step === "template" && renderTemplateStep()}
        {step === "categories" && renderCategoriesStep()}
        {step === "settings" && renderSettingsStep()}

        <div className="flex gap-2 pt-4 border-t mt-4">
          {step !== "template" && !modal && (
            <Button variant="outline" onClick={handleBack} className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          
          <div className="flex-1" />
          
          {step === "template" && (
            <Button onClick={handleNext} className="gap-1">
              Continuar
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          
          {step === "categories" && (
            <Button 
              onClick={handleNext} 
              disabled={selectedCategories.length === 0}
              className="gap-1"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          
          {step === "settings" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-1">
                {saving ? "Salvando..." : modal ? "Salvar" : "Criar Modal"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
