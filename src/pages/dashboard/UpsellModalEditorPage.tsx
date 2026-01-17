// Upsell Modal Editor Page - Full screen professional editor
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Palette,
  ChevronRight
} from "lucide-react";
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
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  category_type: string | null;
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

const STEPS = [
  { id: 1, label: "Modelo" },
  { id: 2, label: "Categorias" },
  { id: 3, label: "Aparência" },
  { id: 4, label: "Configurações" },
];

export default function UpsellModalEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { restaurantId } = useActiveRestaurant();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    description: "",
    target_category_id: "",
    is_active: true,
    show_quick_add: true,
    max_products: 4,
    button_text: "",
    button_color: "#22c55e",
    secondary_button_text: "",
    icon: "✨",
  });

  useEffect(() => {
    if (restaurantId) {
      loadCategories();
      if (editId) {
        loadModal(editId);
      }
    }
  }, [restaurantId, editId]);

  const loadCategories = async () => {
    if (!restaurantId) return;
    
    const { data } = await supabase
      .from("categories")
      .select("id, name, icon, category_type")
      .eq("store_id", restaurantId)
      .eq("is_active", true)
      .order("display_order");
    
    setCategories(data || []);
  };

  const loadModal = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("upsell_modals")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return;

      setSelectedTemplate(data.modal_type);
      setSelectedCategories(data.trigger_category_id ? [data.trigger_category_id] : []);
      setFormData({
        name: data.name,
        title: data.title,
        description: data.description || "",
        target_category_id: data.target_category_id || "",
        is_active: data.is_active,
        show_quick_add: data.show_quick_add,
        max_products: data.max_products,
        button_text: data.button_text || "Ver Opções",
        button_color: data.button_color || "#22c55e",
        secondary_button_text: data.secondary_button_text || "Não, obrigado",
        icon: data.icon || "✨",
      });
      // Skip to step 3 when editing
      setCurrentStep(3);
    } catch (error) {
      console.error("Error loading modal:", error);
      toast.error("Erro ao carregar modal");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate("/dashboard/upsell-modals");
  };

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
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedTemplate !== null;
      case 2: return selectedCategories.length > 0;
      case 3: return formData.title.trim() && formData.button_text.trim();
      case 4: return formData.name.trim();
      default: return false;
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
    if (!restaurantId) return;

    setSaving(true);
    try {
      const data = {
        store_id: restaurantId,
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

      if (editId) {
        const { error } = await supabase
          .from("upsell_modals")
          .update(data)
          .eq("id", editId);
        if (error) throw error;
        toast.success("Modal atualizado!");
      } else {
        if (selectedCategories.length === 1) {
          const { error } = await supabase
            .from("upsell_modals")
            .insert(data);
          if (error) throw error;
        } else {
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

      handleClose();
    } catch (error) {
      console.error("Error saving modal:", error);
      toast.error("Erro ao salvar modal");
    } finally {
      setSaving(false);
    }
  };

  const currentTemplate = MODAL_TEMPLATES.find(t => t.id === selectedTemplate);

  // Step 1: Template selection
  const renderTemplateStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Qual tipo de modal?
        </h2>
        <p className="text-sm text-muted-foreground">
          Selecione um modelo pré-configurado ou crie um personalizado
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODAL_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleTemplateSelect(template.id)}
            className={cn(
              "p-5 rounded-xl border-2 transition-all text-left",
              selectedTemplate === template.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl",
                template.color
              )}>
                {template.icon}
              </div>
              <span className="font-semibold text-base">{template.label}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 2: Category selection
  const renderCategoriesStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Onde o modal aparece?
        </h2>
        <p className="text-sm text-muted-foreground">
          Selecione as categorias que disparam este modal após adicionar um item
        </p>
      </div>

      {currentTemplate && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3 mb-6">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl",
            currentTemplate.color
          )}>
            {currentTemplate.icon}
          </div>
          <div>
            <span className="text-sm font-semibold">{currentTemplate.label}</span>
            <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {categories.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Nenhuma categoria ativa no cardápio
          </div>
        ) : (
          categories.map((category) => (
            <label
              key={category.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                selectedCategories.includes(category.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <span className="text-2xl">{category.icon || "📦"}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{category.name}</span>
                {category.category_type && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {category.category_type === "pizza" ? "Pizza" : "Padrão"}
                  </span>
                )}
              </div>
            </label>
          ))
        )}
      </div>

      {selectedCategories.length > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          {selectedCategories.length} categoria{selectedCategories.length > 1 ? 's' : ''} selecionada{selectedCategories.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  // Step 3: Appearance
  const renderAppearanceStep = () => (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Personalize a aparência
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure como o modal será exibido para o cliente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="bg-gradient-to-b from-muted/30 to-muted/50 rounded-2xl p-6 border border-border/50">
          <p className="text-xs text-muted-foreground mb-4 text-center">Prévia do modal</p>
          <div className="bg-background rounded-xl shadow-lg p-6 text-center">
            <span className="text-5xl mb-4 block">{formData.icon}</span>
            <h4 className="font-bold text-base mb-2">{formData.title || "Título do modal"}</h4>
            <p className="text-xs text-muted-foreground mb-4">{formData.description || "Descrição"}</p>
            <div className="space-y-2">
              <button 
                className="w-full py-3 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: formData.button_color }}
              >
                + {formData.button_text || "Botão principal"}
              </button>
              <button className="w-full py-2.5 rounded-xl border-2 border-border text-sm font-medium">
                {formData.secondary_button_text || "Botão secundário"}
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Icon */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ícone (emoji)</Label>
            <Input
              placeholder="🥤"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="text-2xl h-12"
              maxLength={4}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Título</Label>
            <Input
              placeholder="Que tal uma bebida gelada? 😎"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição</Label>
            <Textarea
              placeholder="Complete sua experiência com uma bebida refrescante!"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Button Text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Texto do botão principal</Label>
            <Input
              placeholder="Escolher Bebida"
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
            />
          </div>

          {/* Button Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Cor do botão
            </Label>
            <div className="flex flex-wrap gap-2">
              {BUTTON_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, button_color: color.value })}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 transition-all",
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Texto do botão secundário</Label>
            <Input
              placeholder="Sem Bebida"
              value={formData.secondary_button_text}
              onChange={(e) => setFormData({ ...formData, secondary_button_text: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4: Settings
  const renderSettingsStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Configurações finais
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina o comportamento e opções adicionais
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Nome do modal (interno)</Label>
          <Input
            placeholder="Ex: Bebidas após Pizza"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Usado apenas para identificação no painel administrativo
          </p>
        </div>

        {/* Target Category */}
        {(selectedTemplate === "drink" || selectedTemplate === "custom" || selectedTemplate === "accompaniment") && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sugerir produtos de qual categoria?</Label>
            <Select
              value={formData.target_category_id || "auto"}
              onValueChange={(v) => setFormData({ ...formData, target_category_id: v === "auto" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sugestões automáticas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">🔮 Sugestões automáticas</SelectItem>
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

        {/* Toggle options */}
        <div className="space-y-4 pt-4 border-t">
          {selectedTemplate !== "edge" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Adicionar rápido</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite adicionar produtos diretamente do modal
                  </p>
                </div>
                <Switch
                  checked={formData.show_quick_add}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, show_quick_add: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Máximo de produtos a exibir</Label>
                <Select
                  value={formData.max_products.toString()}
                  onValueChange={(v) => setFormData({ ...formData, max_products: parseInt(v) })}
                >
                  <SelectTrigger className="w-32">
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
              <Label className="text-sm font-medium">Modal ativo</Label>
              <p className="text-xs text-muted-foreground">
                Desative para pausar temporariamente
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
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {editId ? "Editar Modal" : "Novo Modal"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Modais › {editId ? "Editar" : "Criar novo"}
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-card border-b border-border px-4">
        <div className="flex gap-2 overflow-x-auto max-w-3xl mx-auto py-1">
          {STEPS.map((step) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isDisabled = !editId && step.id > currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => {
                  if (editId || step.id <= currentStep) setCurrentStep(step.id);
                }}
                disabled={isDisabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap border-b-2",
                  isCurrent ? "text-primary border-primary" 
                    : isCompleted || editId ? "text-foreground border-transparent cursor-pointer hover:text-primary"
                    : "text-muted-foreground border-transparent cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold",
                  isCurrent ? "bg-primary text-primary-foreground"
                    : isCompleted || editId ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="w-3 h-3" /> : step.id}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 bg-muted/30">
        <div className="p-6">
          {currentStep === 1 && renderTemplateStep()}
          {currentStep === 2 && renderCategoriesStep()}
          {currentStep === 3 && renderAppearanceStep()}
          {currentStep === 4 && renderSettingsStep()}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 md:left-64">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handleBack}
          >
            {currentStep === 1 ? "Cancelar" : "Voltar"}
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-1"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || !canProceed()}
            >
              {saving ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Modal"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
