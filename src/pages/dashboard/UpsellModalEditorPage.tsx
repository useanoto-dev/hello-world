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

// Modelo types
type ModelType = "pizza" | "padrao";

// Templates organizados por modelo
const PIZZA_TEMPLATES = [
  { 
    id: "combo", 
    label: "Modal Casado", 
    icon: "🍕", 
    color: "bg-gradient-to-r from-orange-500 to-purple-500",
    bgLight: "bg-gradient-to-r from-orange-50 to-purple-50 border-purple-200 hover:from-orange-100 hover:to-purple-100",
    bgSelected: "bg-gradient-to-r from-orange-100 to-purple-100 border-purple-400",
    description: "Tela cheia: Massa + Borda + Adicionais juntos",
    defaultTitle: "Deseja adicionar algo? ✨",
    defaultDescription: "Turbine sua pizza com ingredientes extras!",
    defaultButtonText: "Confirmar",
    defaultButtonColor: "#3b82f6",
    defaultSecondaryText: "Não, obrigado",
    defaultIcon: "✨",
    contentType: "combo",
  },
  { 
    id: "drink", 
    label: "Bebidas", 
    icon: "🥤", 
    color: "bg-red-500",
    bgLight: "bg-red-50 border-red-200 hover:bg-red-100",
    bgSelected: "bg-red-100 border-red-400",
    description: "Sugere bebidas após adicionar pizza",
    defaultTitle: "Que tal uma bebida gelada? 😎",
    defaultDescription: "Complete sua experiência com uma bebida refrescante!",
    defaultButtonText: "Escolher Bebida",
    defaultButtonColor: "#22c55e",
    defaultSecondaryText: "Sem Bebida",
    defaultIcon: "🥤",
    contentType: "products",
  },
];

const PADRAO_TEMPLATES = [
  { 
    id: "drink", 
    label: "Bebidas", 
    icon: "🥤", 
    color: "bg-red-500",
    bgLight: "bg-red-50 border-red-200 hover:bg-red-100",
    bgSelected: "bg-red-100 border-red-400",
    description: "Sugere bebidas após adicionar um item",
    defaultTitle: "Que tal uma bebida gelada? 😎",
    defaultDescription: "Complete sua experiência com uma bebida refrescante!",
    defaultButtonText: "Escolher Bebida",
    defaultButtonColor: "#22c55e",
    defaultSecondaryText: "Sem Bebida",
    defaultIcon: "🥤",
    contentType: "products",
  },
  { 
    id: "accompaniment", 
    label: "Acompanhamentos", 
    icon: "🍟", 
    color: "bg-indigo-500",
    bgLight: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
    bgSelected: "bg-indigo-100 border-indigo-400",
    description: "Sugere acompanhamentos como batatas, molhos",
    defaultTitle: "Que tal um acompanhamento? 🍟",
    defaultDescription: "Batatas, molhos e muito mais para você!",
    defaultButtonText: "Ver Acompanhamentos",
    defaultButtonColor: "#eab308",
    defaultSecondaryText: "Sem Acompanhamento",
    defaultIcon: "🍟",
    contentType: "products",
  },
  { 
    id: "additional", 
    label: "Adicionais (Integrado)", 
    icon: "➕", 
    color: "bg-teal-500",
    bgLight: "bg-teal-50 border-teal-200 hover:bg-teal-100",
    bgSelected: "bg-teal-100 border-teal-400",
    description: "Puxa adicionais cadastrados na categoria",
    defaultTitle: "Deseja adicionar algo? ✨",
    defaultDescription: "Turbine seu pedido com ingredientes extras!",
    defaultButtonText: "Confirmar",
    defaultButtonColor: "#3b82f6",
    defaultSecondaryText: "Não, obrigado",
    defaultIcon: "➕",
    contentType: "additionals",
  },
  { 
    id: "custom", 
    label: "Personalizado", 
    icon: "✨", 
    color: "bg-pink-500",
    bgLight: "bg-pink-50 border-pink-200 hover:bg-pink-100",
    bgSelected: "bg-pink-100 border-pink-400",
    description: "Crie um modal totalmente personalizado",
    defaultTitle: "Deseja mais alguma coisa? 🎉",
    defaultDescription: "Aproveite para completar seu pedido!",
    defaultButtonText: "Ver Opções",
    defaultButtonColor: "#a855f7",
    defaultSecondaryText: "Não, obrigado",
    defaultIcon: "✨",
    contentType: "products",
  },
];

// All templates for lookup
const ALL_TEMPLATES = [...PIZZA_TEMPLATES, ...PADRAO_TEMPLATES];

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
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    description: "",
    target_category_id: "",
    primary_redirect_category_id: "",
    secondary_redirect_category_id: "",
    is_active: true,
    show_quick_add: true,
    max_products: 4,
    button_text: "",
    button_color: "#22c55e",
    secondary_button_text: "",
    icon: "✨",
  });
  
  // Get templates based on selected model
  const currentTemplates = selectedModel === "pizza" ? PIZZA_TEMPLATES : 
                          selectedModel === "padrao" ? PADRAO_TEMPLATES : [];

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
        primary_redirect_category_id: data.primary_redirect_category_id || "",
        secondary_redirect_category_id: data.secondary_redirect_category_id || "",
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

  const handleModelSelect = (model: ModelType) => {
    setSelectedModel(model);
    setSelectedTemplate(null); // Reset template when model changes
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = currentTemplates.find(t => t.id === templateId);
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
      case 1: return selectedModel !== null && selectedTemplate !== null;
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
      // Determine content_type based on template
      const template = currentTemplates.find(t => t.id === selectedTemplate) || 
                       ALL_TEMPLATES.find(t => t.id === selectedTemplate);
      const contentType = template?.contentType || "products";

      const data = {
        store_id: restaurantId,
        name: formData.name.trim(),
        modal_type: selectedTemplate,
        trigger_category_id: selectedCategories[0] || null,
        target_category_id: formData.target_category_id || null,
        primary_redirect_category_id: formData.primary_redirect_category_id || null,
        secondary_redirect_category_id: formData.secondary_redirect_category_id || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        show_quick_add: formData.show_quick_add,
        max_products: formData.max_products,
        button_text: formData.button_text.trim(),
        button_color: formData.button_color,
        secondary_button_text: formData.secondary_button_text.trim(),
        icon: formData.icon,
        content_type: contentType,
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

  const currentTemplate = currentTemplates.find(t => t.id === selectedTemplate) || 
                         ALL_TEMPLATES.find(t => t.id === selectedTemplate);

  // Step 1: Model and Template selection
  const renderTemplateStep = () => (
    <div className="max-w-xl mx-auto">
      {/* Model Selection */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Escolha o modelo
        </h2>
        <p className="text-sm text-muted-foreground">
          Primeiro, selecione o tipo de categoria
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => handleModelSelect("pizza")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-center",
            selectedModel === "pizza"
              ? "border-orange-400 bg-orange-50"
              : "border-border hover:border-orange-200 hover:bg-orange-50/50"
          )}
        >
          <span className="text-3xl mb-2 block">🍕</span>
          <span className="font-semibold text-sm block">Modelo Pizza</span>
          <p className="text-[10px] text-muted-foreground mt-1">
            Bordas, massas, adicionais integrados
          </p>
        </button>
        
        <button
          type="button"
          onClick={() => handleModelSelect("padrao")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-center",
            selectedModel === "padrao"
              ? "border-blue-400 bg-blue-50"
              : "border-border hover:border-blue-200 hover:bg-blue-50/50"
          )}
        >
          <span className="text-3xl mb-2 block">🍔</span>
          <span className="font-semibold text-sm block">Modelo Padrão</span>
          <p className="text-[10px] text-muted-foreground mt-1">
            Bebidas, acompanhamentos, adicionais
          </p>
        </button>
      </div>

      {/* Template Selection - Only show after model is selected */}
      {selectedModel && (
        <>
          <div className="mb-4">
            <h3 className="font-medium text-sm text-foreground mb-1">
              Escolha o tipo de modal
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedModel === "pizza" 
                ? "Opções integradas com dados da categoria pizza"
                : "Opções para categorias padrão"
              }
            </p>
          </div>

          <div className="space-y-1.5">
            {currentTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template.id)}
                className={cn(
                  "w-full px-3 py-2.5 rounded-md border transition-all text-left flex items-center gap-3",
                  selectedTemplate === template.id
                    ? template.bgSelected
                    : template.bgLight
                )}
              >
                <span className="text-lg">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-xs text-foreground">{template.label}</span>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {template.description}
                  </p>
                </div>
                {selectedTemplate === template.id && (
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // Step 2: Category selection
  const renderCategoriesStep = () => (
    <div className="max-w-xl mx-auto">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-0.5">
          Onde o modal aparece?
        </h2>
        <p className="text-xs text-muted-foreground">
          Selecione as categorias que disparam este modal
        </p>
      </div>

      {currentTemplate && (
        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 flex items-center gap-2.5 mb-4">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white text-base",
            currentTemplate.color
          )}>
            {currentTemplate.icon}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold block">{currentTemplate.label}</span>
            <p className="text-[10px] text-muted-foreground truncate">{currentTemplate.description}</p>
          </div>
        </div>
      )}

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            Nenhuma categoria ativa no cardápio
          </div>
        ) : (
          categories.map((category) => (
            <label
              key={category.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                selectedCategories.includes(category.id)
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
                className="h-4 w-4"
              />
              <span className="text-lg">{category.icon || "📦"}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium block truncate">{category.name}</span>
                {category.category_type && (
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {category.category_type === "pizza" ? "Pizza" : "Padrão"}
                  </span>
                )}
              </div>
            </label>
          ))
        )}
      </div>

      {selectedCategories.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center mt-3">
          {selectedCategories.length} categoria{selectedCategories.length > 1 ? 's' : ''} selecionada{selectedCategories.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  // Step 3: Appearance
  const renderAppearanceStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-0.5">
          Personalize a aparência
        </h2>
        <p className="text-xs text-muted-foreground">
          Configure como o modal será exibido
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preview */}
        <div className="bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg p-4 border border-border/40">
          <p className="text-[10px] text-muted-foreground mb-3 text-center uppercase tracking-wide">Prévia</p>
          <div className="bg-background rounded-lg shadow-md p-4 text-center">
            <span className="text-3xl mb-2 block">{formData.icon}</span>
            <h4 className="font-semibold text-sm mb-1">{formData.title || "Título do modal"}</h4>
            <p className="text-[11px] text-muted-foreground mb-3">{formData.description || "Descrição"}</p>
            <div className="space-y-1.5">
              <button 
                className="w-full py-2 rounded-lg text-white text-xs font-semibold"
                style={{ backgroundColor: formData.button_color }}
              >
                + {formData.button_text || "Botão principal"}
              </button>
              <button className="w-full py-1.5 rounded-lg border border-border text-xs font-medium">
                {formData.secondary_button_text || "Botão secundário"}
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {/* Icon */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Ícone (emoji)</Label>
            <Input
              placeholder="🥤"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="text-xl h-9"
              maxLength={4}
            />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Título</Label>
            <Input
              placeholder="Que tal uma bebida gelada? 😎"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Descrição</Label>
            <Textarea
              placeholder="Complete sua experiência com uma bebida refrescante!"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Button Text */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Texto do botão principal</Label>
            <Input
              placeholder="Escolher Bebida"
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          {/* Button Color */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Cor do botão
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {BUTTON_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, button_color: color.value })}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color.class,
                    formData.button_color === color.value
                      ? "border-foreground scale-110 ring-2 ring-primary/20"
                      : "border-transparent hover:scale-105"
                  )}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Secondary Button Text */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Texto do botão secundário</Label>
            <Input
              placeholder="Sem Bebida"
              value={formData.secondary_button_text}
              onChange={(e) => setFormData({ ...formData, secondary_button_text: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          {/* Primary Button Redirect */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Ao clicar no botão principal, ir para:</Label>
            <Select
              value={formData.primary_redirect_category_id || "none"}
              onValueChange={(v) => setFormData({ ...formData, primary_redirect_category_id: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">📋 Manter no modal</SelectItem>
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

          {/* Secondary Button Redirect */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Ao clicar no botão secundário, ir para:</Label>
            <Select
              value={formData.secondary_redirect_category_id || "close"}
              onValueChange={(v) => setFormData({ ...formData, secondary_redirect_category_id: v === "close" ? "" : v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Fechar modal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="close">✕ Fechar modal</SelectItem>
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
        </div>
      </div>
    </div>
  );

  // Step 4: Settings
  const renderSettingsStep = () => (
    <div className="max-w-xl mx-auto">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-0.5">
          Configurações finais
        </h2>
        <p className="text-xs text-muted-foreground">
          Defina o comportamento do modal
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border/60 p-4 space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nome do modal (interno)</Label>
          <Input
            placeholder="Ex: Bebidas após Pizza"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-8 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Usado apenas para identificação no painel
          </p>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40">
          <div className="min-w-0">
            <Label className="text-xs font-medium">Modal ativo</Label>
            <p className="text-[10px] text-muted-foreground">
              Desative para pausar temporariamente
            </p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, is_active: checked })
            }
            className="scale-90"
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {editId ? "Editar Modal" : "Novo Modal"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Escolha o modelo
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
                  isCurrent ? "text-muted-foreground border-primary" 
                    : isCompleted || editId ? "text-muted-foreground border-transparent cursor-pointer hover:text-foreground"
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
      <div className="flex-1 overflow-y-auto pb-24 bg-white">
        <div className="p-6">
          {currentStep === 1 && renderTemplateStep()}
          {currentStep === 2 && renderCategoriesStep()}
          {currentStep === 3 && renderAppearanceStep()}
          {currentStep === 4 && renderSettingsStep()}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 md:left-64">
        <div className="max-w-xl mx-auto flex items-center justify-center gap-3">
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
