// Standard Category Editor - Universal model for any business type
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, AlertCircle, GripVertical, ChevronDown, ChevronUp, Layers, IceCream, Sandwich, UtensilsCrossed, Coffee, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============= BUSINESS TEMPLATES =============
// Pre-configured templates for different business types

interface BusinessTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  exampleCategories: string[];
  hasSizes: boolean;
  sizes?: { name: string; price: number }[];
  optionGroups: {
    name: string;
    description: string;
    isRequired: boolean;
    minSelections: number;
    maxSelections: number;
    selectionType: "single" | "multiple";
    freeItems: boolean;
    items: { name: string; price: number }[];
  }[];
}

const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: "acaiteria",
    name: "Açaiteria",
    icon: <IceCream className="w-6 h-6" />,
    description: "Açaí, cremes e sobremesas geladas",
    color: "bg-purple-500/10 border-purple-500/30 text-purple-600",
    exampleCategories: ["Açaí", "Cremes", "Vitaminas"],
    hasSizes: true,
    sizes: [
      { name: "300ml", price: 15 },
      { name: "500ml", price: 22 },
      { name: "700ml", price: 28 },
      { name: "1 Litro", price: 35 },
    ],
    optionGroups: [
      {
        name: "Acompanhamentos",
        description: "Escolha até 8 acompanhamentos grátis",
        isRequired: false,
        minSelections: 0,
        maxSelections: 8,
        selectionType: "multiple",
        freeItems: true,
        items: [
          { name: "Granola", price: 0 },
          { name: "Leite em pó", price: 0 },
          { name: "Paçoca", price: 0 },
          { name: "Banana", price: 0 },
          { name: "Morango", price: 0 },
          { name: "Leite condensado", price: 0 },
          { name: "Mel", price: 0 },
          { name: "Amendoim", price: 0 },
        ],
      },
      {
        name: "Adicionais",
        description: "Adicione extras pagos",
        isRequired: false,
        minSelections: 0,
        maxSelections: 10,
        selectionType: "multiple",
        freeItems: false,
        items: [
          { name: "Nutella", price: 5 },
          { name: "Bis", price: 3 },
          { name: "Ovomaltine", price: 4 },
          { name: "Confete", price: 2 },
          { name: "Creme de ninho", price: 4 },
        ],
      },
    ],
  },
  {
    id: "hamburgueria",
    name: "Hamburgueria",
    icon: <Sandwich className="w-6 h-6" />,
    description: "Hambúrgueres, sanduíches e combos",
    color: "bg-orange-500/10 border-orange-500/30 text-orange-600",
    exampleCategories: ["Hambúrgueres", "Combos", "Batatas", "Bebidas"],
    hasSizes: false,
    optionGroups: [
      {
        name: "Ponto da Carne",
        description: "Como você quer a carne?",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        selectionType: "single",
        freeItems: true,
        items: [
          { name: "Mal passado", price: 0 },
          { name: "Ao ponto", price: 0 },
          { name: "Bem passado", price: 0 },
        ],
      },
      {
        name: "Adicionais",
        description: "Turbine seu hambúrguer",
        isRequired: false,
        minSelections: 0,
        maxSelections: 10,
        selectionType: "multiple",
        freeItems: false,
        items: [
          { name: "Bacon extra", price: 5 },
          { name: "Queijo extra", price: 4 },
          { name: "Ovo", price: 3 },
          { name: "Cebola caramelizada", price: 4 },
        ],
      },
      {
        name: "Remover ingredientes",
        description: "Não quer algum ingrediente?",
        isRequired: false,
        minSelections: 0,
        maxSelections: 10,
        selectionType: "multiple",
        freeItems: true,
        items: [
          { name: "Sem cebola", price: 0 },
          { name: "Sem tomate", price: 0 },
          { name: "Sem alface", price: 0 },
          { name: "Sem maionese", price: 0 },
          { name: "Sem picles", price: 0 },
        ],
      },
    ],
  },
  {
    id: "restaurante",
    name: "Restaurante",
    icon: <UtensilsCrossed className="w-6 h-6" />,
    description: "Pratos, marmitas e refeições",
    color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
    exampleCategories: ["Pratos Executivos", "Marmitas", "Porções", "Sobremesas"],
    hasSizes: true,
    sizes: [
      { name: "Individual", price: 25 },
      { name: "Casal (2 pessoas)", price: 45 },
      { name: "Família (4 pessoas)", price: 80 },
    ],
    optionGroups: [
      {
        name: "Acompanhamentos",
        description: "Escolha seus acompanhamentos",
        isRequired: false,
        minSelections: 0,
        maxSelections: 3,
        selectionType: "multiple",
        freeItems: true,
        items: [
          { name: "Arroz branco", price: 0 },
          { name: "Arroz integral", price: 0 },
          { name: "Feijão", price: 0 },
          { name: "Farofa", price: 0 },
          { name: "Salada", price: 0 },
        ],
      },
      {
        name: "Proteína Extra",
        description: "Quer adicionar proteína?",
        isRequired: false,
        minSelections: 0,
        maxSelections: 2,
        selectionType: "multiple",
        freeItems: false,
        items: [
          { name: "Ovo frito", price: 4 },
          { name: "Bacon", price: 6 },
          { name: "Linguiça", price: 7 },
        ],
      },
    ],
  },
  {
    id: "lanchonete",
    name: "Lanchonete / Cafeteria",
    icon: <Coffee className="w-6 h-6" />,
    description: "Lanches, salgados, cafés e sucos",
    color: "bg-amber-500/10 border-amber-500/30 text-amber-600",
    exampleCategories: ["Salgados", "Doces", "Cafés", "Sucos", "Vitaminas"],
    hasSizes: true,
    sizes: [
      { name: "Pequeno", price: 8 },
      { name: "Médio", price: 12 },
      { name: "Grande", price: 16 },
    ],
    optionGroups: [
      {
        name: "Tipo de leite",
        description: "Qual leite você prefere?",
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        selectionType: "single",
        freeItems: true,
        items: [
          { name: "Leite integral", price: 0 },
          { name: "Leite desnatado", price: 0 },
          { name: "Leite vegetal", price: 2 },
        ],
      },
      {
        name: "Adicionais",
        description: "Complemente seu pedido",
        isRequired: false,
        minSelections: 0,
        maxSelections: 5,
        selectionType: "multiple",
        freeItems: false,
        items: [
          { name: "Chantilly", price: 2 },
          { name: "Canela", price: 1 },
          { name: "Chocolate extra", price: 3 },
        ],
      },
    ],
  },
  {
    id: "personalizado",
    name: "Personalizado",
    icon: <Sparkles className="w-6 h-6" />,
    description: "Configure do zero, do seu jeito",
    color: "bg-primary/10 border-primary/30 text-primary",
    exampleCategories: ["Qualquer tipo de produto"],
    hasSizes: false,
    optionGroups: [],
  },
];

// ============= TYPES =============

interface ScheduleItem {
  days: string[];
  startTime: string;
  endTime: string;
}

interface StandardSize {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  isActive: boolean;
}

interface OptionGroupItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  isActive: boolean;
}

interface OptionGroup {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  selectionType: "single" | "multiple";
  isActive: boolean;
  items: OptionGroupItem[];
  isOpen: boolean;
}

interface StandardCategoryEditorProps {
  editId?: string | null;
  storeId: string;
  onClose: () => void;
}

const DAYS = [
  { key: 'sunday', label: 'Domingo', short: 'D' },
  { key: 'monday', label: 'Segunda', short: 'S' },
  { key: 'tuesday', label: 'Terça', short: 'T' },
  { key: 'wednesday', label: 'Quarta', short: 'Q' },
  { key: 'thursday', label: 'Quinta', short: 'Q' },
  { key: 'friday', label: 'Sexta', short: 'S' },
  { key: 'saturday', label: 'Sábado', short: 'S' },
];

const STEPS = [
  { id: 1, label: "Modelo" },
  { id: 2, label: "Categoria" },
  { id: 3, label: "Tamanhos" },
  { id: 4, label: "Personalização" },
];

// ============= SORTABLE COMPONENTS =============

function SortableSizeItem({ 
  size, 
  onUpdate, 
  onRemove, 
  canRemove 
}: { 
  size: StandardSize; 
  onUpdate: (id: string, field: keyof StandardSize, value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: size.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-card border border-border rounded-lg",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        type="button"
        className="touch-none text-muted-foreground hover:text-foreground cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1">
        <Input
          value={size.name}
          onChange={(e) => onUpdate(size.id, "name", e.target.value)}
          placeholder="Ex: 300ml, Pequeno, Individual"
          className="h-9"
        />
      </div>

      <div className="w-28">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={size.basePrice || ""}
            onChange={(e) => onUpdate(size.id, "basePrice", parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <Switch
        checked={size.isActive}
        onCheckedChange={(checked) => onUpdate(size.id, "isActive", checked)}
        className="data-[state=checked]:bg-primary"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(size.id)}
        disabled={!canRemove}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

function SortableOptionItem({ 
  item, 
  onUpdate, 
  onRemove, 
  canRemove 
}: { 
  item: OptionGroupItem; 
  onUpdate: (id: string, field: keyof OptionGroupItem, value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-muted/50 border border-border rounded-lg",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        type="button"
        className="touch-none text-muted-foreground hover:text-foreground cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3" />
      </button>

      <div className="flex-1">
        <Input
          value={item.name}
          onChange={(e) => onUpdate(item.id, "name", e.target.value)}
          placeholder="Nome da opção"
          className="h-8 text-sm"
        />
      </div>

      <div className="w-24">
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.price || ""}
            onChange={(e) => onUpdate(item.id, "price", parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className="h-8 pl-7 text-sm"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        disabled={!canRemove}
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

function SortableOptionGroup({ 
  group,
  onUpdate,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onRemove, 
  canRemove,
  sensors
}: { 
  group: OptionGroup;
  onUpdate: (id: string, field: keyof OptionGroup, value: any) => void;
  onUpdateItem: (groupId: string, itemId: string, field: keyof OptionGroupItem, value: any) => void;
  onAddItem: (groupId: string) => void;
  onRemoveItem: (groupId: string, itemId: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  sensors: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = group.items.findIndex((i) => i.id === active.id);
      const newIndex = group.items.findIndex((i) => i.id === over.id);
      onUpdate(group.id, "items", arrayMove(group.items, oldIndex, newIndex));
    }
  };

  // Generate description based on settings
  const getGroupDescription = () => {
    if (group.isRequired && group.maxSelections === 1) {
      return "Obrigatório • Escolha 1";
    }
    if (group.isRequired) {
      return `Obrigatório • Escolha ${group.minSelections}-${group.maxSelections}`;
    }
    if (group.maxSelections === 1) {
      return "Opcional • Até 1";
    }
    return `Opcional • Até ${group.maxSelections}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <Collapsible open={group.isOpen} onOpenChange={(open) => onUpdate(group.id, "isOpen", open)}>
        <div className="flex items-center gap-3 p-3 bg-muted/30">
          <button
            type="button"
            className="touch-none text-muted-foreground hover:text-foreground cursor-grab"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Input
                value={group.name}
                onChange={(e) => onUpdate(group.id, "name", e.target.value)}
                placeholder="Nome do grupo"
                className="h-8 font-medium"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {getGroupDescription()} • {group.items.length} {group.items.length === 1 ? "opção" : "opções"}
            </p>
          </div>

          <Switch
            checked={group.isActive}
            onCheckedChange={(checked) => onUpdate(group.id, "isActive", checked)}
            className="data-[state=checked]:bg-primary"
          />

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {group.isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(group.id)}
            disabled={!canRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="p-3 space-y-3 border-t border-border">
            {/* Simplified Settings */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={group.isRequired}
                  onCheckedChange={(checked) => {
                    onUpdate(group.id, "isRequired", !!checked);
                    if (checked) {
                      onUpdate(group.id, "minSelections", 1);
                    } else {
                      onUpdate(group.id, "minSelections", 0);
                    }
                  }}
                  className="data-[state=checked]:bg-primary"
                />
                <Label className="text-xs">Obrigatório</Label>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Tipo:</Label>
                <Select
                  value={group.selectionType}
                  onValueChange={(value: "single" | "multiple") => {
                    onUpdate(group.id, "selectionType", value);
                    if (value === "single") {
                      onUpdate(group.id, "maxSelections", 1);
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Única</SelectItem>
                    <SelectItem value="multiple">Múltipla</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {group.selectionType === "multiple" && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Mín:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={group.minSelections}
                      onChange={(e) => onUpdate(group.id, "minSelections", Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-7 w-16 text-xs text-center"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Máx:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={group.maxSelections}
                      onChange={(e) => onUpdate(group.id, "maxSelections", Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-7 w-16 text-xs text-center"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
                <SortableContext items={group.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <SortableOptionItem
                        key={item.id}
                        item={item}
                        onUpdate={(itemId, field, value) => onUpdateItem(group.id, itemId, field, value)}
                        onRemove={(itemId) => onRemoveItem(group.id, itemId)}
                        canRemove={group.items.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <button
                type="button"
                onClick={() => onAddItem(group.id)}
                className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar opção
              </button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============= MAIN COMPONENT =============

export function StandardCategoryEditor({ editId, storeId, onClose }: StandardCategoryEditorProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [isPromotion, setIsPromotion] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState("");
  const [availability, setAvailability] = useState<"always" | "paused" | "scheduled">("always");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    { days: [], startTime: "00:00", endTime: "23:59" }
  ]);

  // Sizes state
  const [hasSizes, setHasSizes] = useState<"yes" | "no">("no");
  const [sizes, setSizes] = useState<StandardSize[]>([]);

  // Option Groups state
  const [hasOptionGroups, setHasOptionGroups] = useState<"yes" | "no">("no");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Apply template
  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = BUSINESS_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    // Apply sizes
    if (template.hasSizes && template.sizes) {
      setHasSizes("yes");
      setSizes(template.sizes.map(s => ({
        id: crypto.randomUUID(),
        name: s.name,
        basePrice: s.price,
        isActive: true,
      })));
    } else {
      setHasSizes("no");
      setSizes([]);
    }

    // Apply option groups
    if (template.optionGroups.length > 0) {
      setHasOptionGroups("yes");
      setOptionGroups(template.optionGroups.map(g => ({
        id: crypto.randomUUID(),
        name: g.name,
        description: g.description,
        isRequired: g.isRequired,
        minSelections: g.minSelections,
        maxSelections: g.maxSelections,
        selectionType: g.selectionType,
        isActive: true,
        isOpen: false,
        items: g.items.map(i => ({
          id: crypto.randomUUID(),
          name: i.name,
          price: i.price,
          isActive: true,
        })),
      })));
    } else {
      setHasOptionGroups("no");
      setOptionGroups([]);
    }

    // Go to next step
    setCurrentStep(2);
  };

  // Add a new option group
  const addOptionGroup = () => {
    const newGroup: OptionGroup = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      selectionType: "multiple",
      isActive: true,
      items: [
        { id: crypto.randomUUID(), name: "", price: 0, isActive: true }
      ],
      isOpen: true
    };
    setOptionGroups(prev => [...prev, newGroup]);
  };

  // Remove option group
  const removeOptionGroup = (id: string) => {
    setOptionGroups(prev => prev.filter(g => g.id !== id));
  };

  // Update option group
  const updateOptionGroup = (id: string, field: keyof OptionGroup, value: any) => {
    setOptionGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  // Add item to group
  const addItemToGroup = (groupId: string) => {
    setOptionGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        items: [...g.items, { id: crypto.randomUUID(), name: "", price: 0, isActive: true }]
      };
    }));
  };

  // Remove item from group
  const removeItemFromGroup = (groupId: string, itemId: string) => {
    setOptionGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      if (g.items.length <= 1) return g;
      return {
        ...g,
        items: g.items.filter(i => i.id !== itemId)
      };
    }));
  };

  // Update item in group
  const updateItemInGroup = (groupId: string, itemId: string, field: keyof OptionGroupItem, value: any) => {
    setOptionGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        items: g.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
      };
    }));
  };

  // Size functions
  const addSize = () => {
    setSizes(prev => [...prev, { 
      id: crypto.randomUUID(), 
      name: "", 
      basePrice: 0, 
      isActive: true 
    }]);
  };

  const removeSize = (id: string) => {
    if (sizes.length > 1) {
      setSizes(prev => prev.filter(s => s.id !== id));
    }
  };

  const updateSize = (id: string, field: keyof StandardSize, value: any) => {
    setSizes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Schedule functions
  const toggleDay = (scheduleIndex: number, dayKey: string) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      const days = newSchedules[scheduleIndex].days;
      if (days.includes(dayKey)) {
        newSchedules[scheduleIndex].days = days.filter(d => d !== dayKey);
      } else {
        newSchedules[scheduleIndex].days = [...days, dayKey];
      }
      return newSchedules;
    });
  };

  const addSchedule = () => {
    setSchedules(prev => [...prev, { days: [], startTime: "00:00", endTime: "23:59" }]);
  };

  const removeSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Drag end handlers
  const handleSizeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSizes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOptionGroups((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Save category
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .insert({
          store_id: storeId,
          name: name.trim(),
          slug,
          description: isPromotion ? promotionMessage : null,
          is_active: availability !== "paused",
          category_type: "standard",
        })
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Save sizes
      if (hasSizes === "yes" && sizes.length > 0) {
        const validSizes = sizes.filter(s => s.name.trim());
        
        for (let i = 0; i < validSizes.length; i++) {
          const size = validSizes[i];
          await supabase.from("standard_sizes").insert({
            store_id: storeId,
            category_id: category.id,
            name: size.name.trim(),
            base_price: size.basePrice || 0,
            description: size.description || null,
            is_active: size.isActive,
            display_order: i,
          });
        }
      }

      // Save option groups
      if (hasOptionGroups === "yes" && optionGroups.length > 0) {
        for (let i = 0; i < optionGroups.length; i++) {
          const group = optionGroups[i];
          if (!group.name.trim()) continue;

          const { data: savedGroup, error: groupError } = await supabase
            .from("category_option_groups")
            .insert({
              store_id: storeId,
              category_id: category.id,
              name: group.name.trim(),
              is_required: group.isRequired,
              min_selections: group.minSelections,
              max_selections: group.maxSelections,
              selection_type: group.selectionType,
              is_active: group.isActive,
              display_order: i,
              is_primary: false,
              display_mode: "modal",
              item_layout: "list",
              show_item_images: false,
            })
            .select()
            .single();

          if (groupError) throw groupError;

          if (savedGroup) {
            const validItems = group.items.filter(item => item.name.trim());
            for (let j = 0; j < validItems.length; j++) {
              const item = validItems[j];
              await supabase.from("category_option_items").insert({
                store_id: storeId,
                group_id: savedGroup.id,
                name: item.name.trim(),
                additional_price: item.price || 0,
                is_active: item.isActive,
                display_order: j,
              });
            }
          }
        }
      }

      toast.success("Categoria criada com sucesso!");
      navigate("/dashboard/menu-manager");
      navigate("/dashboard/menu");
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  // Get current template
  const currentTemplate = BUSINESS_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              Nova categoria
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentTemplate ? `Modelo: ${currentTemplate.name}` : "Escolha um modelo de negócio"}
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-card border-b border-border px-4">
        <div className="flex gap-1 overflow-x-auto max-w-3xl mx-auto py-1">
          {STEPS.map((step) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isDisabled = step.id > currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => {
                  if (step.id <= currentStep) setCurrentStep(step.id);
                }}
                disabled={isDisabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap border-b-2",
                  isCurrent ? "text-primary border-primary" 
                    : isCompleted ? "text-foreground border-transparent cursor-pointer hover:text-primary"
                    : "text-muted-foreground border-transparent cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold",
                  isCurrent ? "bg-primary text-primary-foreground"
                    : isCompleted ? "bg-primary text-primary-foreground"
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
      <div className="flex-1 overflow-y-auto pb-24 bg-background">
        <div className="max-w-3xl mx-auto p-4">
          
          {/* Step 1: Choose Template */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-foreground">Qual é o seu tipo de negócio?</h2>
                <p className="text-sm text-muted-foreground">Escolha um modelo pré-configurado ou comece do zero</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUSINESS_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className={cn(
                      "flex flex-col p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
                      template.color
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {template.icon}
                      <span className="font-semibold">{template.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.exampleCategories.map((cat, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-background/80 rounded text-[10px] text-muted-foreground">
                          {cat}
                        </span>
                      ))}
                    </div>
                    {template.id !== "personalizado" && (
                      <div className="mt-3 pt-2 border-t border-current/10">
                        <p className="text-[10px] text-muted-foreground">
                          {template.hasSizes && template.sizes ? `${template.sizes.length} tamanhos` : "Sem tamanhos"} • {template.optionGroups.length} grupos de opções
                        </p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Category Info */}
          {currentStep === 2 && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-4 space-y-5">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Atenção!</span> O nome da categoria é obrigatório.
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Nome da categoria <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={currentTemplate?.exampleCategories[0] || "Ex.: Hambúrgueres, Açaí, Bebidas"}
                  className="border-border"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isPromotion}
                    onCheckedChange={setIsPromotion}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label className="text-sm font-medium">Promoção</Label>
                </div>
                {isPromotion && (
                  <div className="flex-1">
                    <Input
                      value={promotionMessage}
                      onChange={(e) => setPromotionMessage(e.target.value.slice(0, 8))}
                      placeholder="Ex.: 10% OFF"
                      maxLength={8}
                      className="h-9"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Disponibilidade</Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: "always", label: "Sempre disponível" },
                    { value: "paused", label: "Pausado", className: "text-destructive" },
                    { value: "scheduled", label: "Horários específicos" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          availability === opt.value ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setAvailability(opt.value as typeof availability)}
                      >
                        {availability === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className={cn("text-sm", opt.className)} onClick={() => setAvailability(opt.value as typeof availability)}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>

                {availability === "scheduled" && (
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-2 border border-border">
                    {schedules.map((schedule, scheduleIndex) => (
                      <div key={scheduleIndex} className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-0.5">
                          {DAYS.map((day) => (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => toggleDay(scheduleIndex, day.key)}
                              className={cn(
                                "w-7 h-7 rounded-full text-xs font-medium transition-colors",
                                schedule.days.includes(day.key)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card border border-border text-muted-foreground hover:border-primary"
                              )}
                              title={day.label}
                            >
                              {day.short}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => {
                              const newSchedules = [...schedules];
                              newSchedules[scheduleIndex].startTime = e.target.value;
                              setSchedules(newSchedules);
                            }}
                            className="w-20 h-8 text-xs border-border"
                          />
                          <span className="text-xs text-muted-foreground">às</span>
                          <Input
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) => {
                              const newSchedules = [...schedules];
                              newSchedules[scheduleIndex].endTime = e.target.value;
                              setSchedules(newSchedules);
                            }}
                            className="w-20 h-8 text-xs border-border"
                          />
                          {schedules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSchedule(scheduleIndex)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addSchedule}
                      className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Horário
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Sizes */}
          {currentStep === 3 && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium text-foreground">Os produtos têm tamanhos?</Label>
                <div className="flex items-center gap-3">
                  {["yes", "no"].map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasSizes === opt ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => {
                          setHasSizes(opt as typeof hasSizes);
                          if (opt === "yes" && sizes.length === 0) {
                            setSizes([{ id: crypto.randomUUID(), name: "", basePrice: 0, isActive: true }]);
                          }
                        }}
                      >
                        {hasSizes === opt && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">{opt === "yes" ? "Sim" : "Não"}</span>
                    </label>
                  ))}
                </div>
              </div>

              {hasSizes === "no" && (
                <div className="p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    ✓ Os produtos terão preço único, definido no cadastro de cada item.
                  </p>
                </div>
              )}

              {hasSizes === "yes" && (
                <>
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs text-foreground">
                      💡 Exemplos de tamanhos:
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      • Açaí: 300ml, 500ml, 700ml, 1L<br/>
                      • Hambúrguer: Simples, Duplo, Triplo<br/>
                      • Marmita: P, M, G, GG
                    </p>
                  </div>

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSizeDragEnd}>
                    <SortableContext items={sizes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {sizes.map((size) => (
                          <SortableSizeItem
                            key={size.id}
                            size={size}
                            onUpdate={updateSize}
                            onRemove={removeSize}
                            canRemove={sizes.length > 1}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <button
                    type="button"
                    onClick={addSize}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar tamanho
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 4: Option Groups (Personalização) */}
          {currentStep === 4 && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium text-foreground">Tem opções de personalização?</Label>
                <div className="flex items-center gap-3">
                  {["yes", "no"].map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasOptionGroups === opt ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setHasOptionGroups(opt as typeof hasOptionGroups)}
                      >
                        {hasOptionGroups === opt && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">{opt === "yes" ? "Sim" : "Não"}</span>
                    </label>
                  ))}
                </div>
              </div>

              {hasOptionGroups === "no" && (
                <div className="p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    ✓ Os produtos serão adicionados ao carrinho diretamente, sem personalização.
                  </p>
                </div>
              )}

              {hasOptionGroups === "yes" && (
                <>
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-2">
                    <p className="text-xs font-medium text-foreground">
                      💡 Grupos de personalização permitem que o cliente escolha opções:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">🍨</span>
                        <div>
                          <p className="font-medium text-foreground">Acompanhamentos grátis</p>
                          <p>"Escolha até 8 coberturas"</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">💰</span>
                        <div>
                          <p className="font-medium text-foreground">Adicionais pagos</p>
                          <p>"Nutella +R$5, Bis +R$3"</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">⭐</span>
                        <div>
                          <p className="font-medium text-foreground">Escolha obrigatória</p>
                          <p>"Ponto da carne: Mal passado, Ao ponto..."</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">❌</span>
                        <div>
                          <p className="font-medium text-foreground">Remover ingredientes</p>
                          <p>"Sem cebola, sem tomate"</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Option Groups List */}
                  {optionGroups.length > 0 && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
                      <SortableContext items={optionGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {optionGroups.map((group) => (
                            <SortableOptionGroup
                              key={group.id}
                              group={group}
                              onUpdate={updateOptionGroup}
                              onUpdateItem={updateItemInGroup}
                              onAddItem={addItemToGroup}
                              onRemoveItem={removeItemFromGroup}
                              onRemove={removeOptionGroup}
                              canRemove={true}
                              sensors={sensors}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {optionGroups.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                      <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum grupo criado ainda</p>
                      <p className="text-xs">Clique no botão abaixo para adicionar</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={addOptionGroup}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar grupo de opções
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                onClose();
              }
            }}
          >
            {currentStep > 1 ? "Voltar" : "Cancelar"}
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !selectedTemplate || currentStep === 2 && !name.trim()}
            >
              Continuar
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? "Salvando..." : "Salvar Categoria"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
