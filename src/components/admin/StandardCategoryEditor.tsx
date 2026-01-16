// Standard Category Editor - Universal model for hamburgers, açaí, beverages, restaurants, etc.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, AlertCircle, GripVertical, ChevronDown, ChevronUp, Settings2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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

const STANDARD_STEPS = [
  { id: 1, label: "Categoria" },
  { id: 2, label: "Tamanhos" },
  { id: 3, label: "Grupos de Opções" },
];

const DAYS = [
  { key: 'sunday', label: 'Domingo', short: 'D' },
  { key: 'monday', label: 'Segunda', short: 'S' },
  { key: 'tuesday', label: 'Terça', short: 'T' },
  { key: 'wednesday', label: 'Quarta', short: 'Q' },
  { key: 'thursday', label: 'Quinta', short: 'Q' },
  { key: 'friday', label: 'Sexta', short: 'S' },
  { key: 'saturday', label: 'Sábado', short: 'S' },
];

// Predefined group templates for common use cases
const GROUP_TEMPLATES = [
  { 
    name: "Adicionais", 
    icon: "🧀",
    description: "Extras pagos (bacon, queijo, etc)",
    isRequired: false, 
    minSelections: 0, 
    maxSelections: 10,
    selectionType: "multiple" as const
  },
  { 
    name: "Escolha obrigatória", 
    icon: "⭐",
    description: "Ex: Base do açaí, ponto da carne",
    isRequired: true, 
    minSelections: 1, 
    maxSelections: 1,
    selectionType: "single" as const
  },
  { 
    name: "Acompanhamentos", 
    icon: "🍟",
    description: "Escolha X acompanhamentos",
    isRequired: false, 
    minSelections: 0, 
    maxSelections: 2,
    selectionType: "multiple" as const
  },
  { 
    name: "Remover ingredientes", 
    icon: "❌",
    description: "Sem cebola, sem tomate (grátis)",
    isRequired: false, 
    minSelections: 0, 
    maxSelections: 10,
    selectionType: "multiple" as const
  },
  { 
    name: "Personalizado", 
    icon: "⚙️",
    description: "Configure do seu jeito",
    isRequired: false, 
    minSelections: 0, 
    maxSelections: 5,
    selectionType: "multiple" as const
  },
];

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

// Sortable Size Item
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
          placeholder="Ex: Pequeno, Médio, Grande"
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

      <div className="flex items-center gap-2">
        <Switch
          checked={size.isActive}
          onCheckedChange={(checked) => onUpdate(size.id, "isActive", checked)}
          className="data-[state=checked]:bg-primary"
        />
        <span className="text-xs text-muted-foreground w-10">
          {size.isActive ? "Ativo" : "Inativo"}
        </span>
      </div>

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

// Sortable Option Item within a group
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

      <Switch
        checked={item.isActive}
        onCheckedChange={(checked) => onUpdate(item.id, "isActive", checked)}
        className="data-[state=checked]:bg-primary scale-90"
      />

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

// Sortable Option Group
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
            <Input
              value={group.name}
              onChange={(e) => onUpdate(group.id, "name", e.target.value)}
              placeholder="Nome do grupo"
              className="h-9 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border border-border">
              <span className="text-xs text-muted-foreground">
                {group.isRequired ? "Obrigatório" : "Opcional"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {group.items.length} {group.items.length === 1 ? "item" : "itens"}
            </span>
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
            {/* Group Settings */}
            <div className="flex flex-wrap gap-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={group.isRequired}
                  onCheckedChange={(checked) => onUpdate(group.id, "isRequired", !!checked)}
                  className="data-[state=checked]:bg-primary"
                />
                <Label className="text-xs">Obrigatório</Label>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Tipo:</Label>
                <Select
                  value={group.selectionType}
                  onValueChange={(value) => onUpdate(group.id, "selectionType", value)}
                >
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Escolha única</SelectItem>
                    <SelectItem value="multiple">Múltipla escolha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Mín:</Label>
                <Input
                  type="number"
                  min="0"
                  value={group.minSelections}
                  onChange={(e) => onUpdate(group.id, "minSelections", Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-7 w-14 text-xs text-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Máx:</Label>
                <Input
                  type="number"
                  min="1"
                  value={group.maxSelections}
                  onChange={(e) => onUpdate(group.id, "maxSelections", Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-7 w-14 text-xs text-center"
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Opções do grupo:</Label>
              
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

export function StandardCategoryEditor({ editId, storeId, onClose }: StandardCategoryEditorProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [name, setName] = useState("");
  const [isPromotion, setIsPromotion] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState("");
  const [availability, setAvailability] = useState<"always" | "paused" | "scheduled">("always");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    { days: [], startTime: "00:00", endTime: "23:59" }
  ]);
  const [channels, setChannels] = useState({
    all: true,
    pdv: true,
    cardapioDigital: true,
  });

  // Sizes state
  const [hasSizes, setHasSizes] = useState<"yes" | "no">("no");
  const [sizes, setSizes] = useState<StandardSize[]>([
    { id: crypto.randomUUID(), name: "", basePrice: 0, isActive: true }
  ]);

  // Option Groups state (the universal solution!)
  const [hasOptionGroups, setHasOptionGroups] = useState<"yes" | "no">("no");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Add option group from template
  const addOptionGroup = (template: typeof GROUP_TEMPLATES[0]) => {
    const newGroup: OptionGroup = {
      id: crypto.randomUUID(),
      name: template.name === "Personalizado" ? "" : template.name,
      isRequired: template.isRequired,
      minSelections: template.minSelections,
      maxSelections: template.maxSelections,
      selectionType: template.selectionType,
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

  // Channel handling
  const handleChannelChange = (channel: keyof typeof channels, checked: boolean) => {
    if (channel === "all") {
      setChannels({
        all: checked,
        pdv: checked,
        cardapioDigital: checked,
      });
    } else {
      const newChannels = { ...channels, [channel]: checked };
      const allChecked = newChannels.pdv && newChannels.cardapioDigital;
      setChannels({ ...newChannels, all: allChecked });
    }
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
      // Create category
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

      // Save sizes if has sizes
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

      // Save option groups (the universal part!)
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

          // Save items in the group
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
      onClose();
      navigate("/dashboard/menu");
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  // Category form content
  const CategoryFormContent = (
    <div className="space-y-5">
      {/* Alert */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
        <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Atenção!</span> Existem campos obrigatórios.
        </span>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Nome da categoria <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Hambúrgueres, Açaí, Bebidas, Pratos"
          className="border-border"
        />
      </div>

      {/* Promotion */}
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

      {/* Availability */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">Disponibilidade</Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <div 
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                availability === "always" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => setAvailability("always")}
            >
              {availability === "always" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm" onClick={() => setAvailability("always")}>Sempre disponível</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div 
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                availability === "paused" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => setAvailability("paused")}
            >
              {availability === "paused" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm text-destructive" onClick={() => setAvailability("paused")}>Pausado</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div 
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                availability === "scheduled" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => setAvailability("scheduled")}
            >
              {availability === "scheduled" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm" onClick={() => setAvailability("scheduled")}>Horários específicos</span>
          </label>
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

      {/* Channels */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">Exibição por canais</Label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={channels.all}
              onCheckedChange={(checked) => handleChannelChange("all", !!checked)}
              className="h-4 w-4 data-[state=checked]:bg-primary"
            />
            <span className="text-sm">Todos os canais</span>
          </label>

          <div className="ml-5 space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={channels.pdv}
                onCheckedChange={(checked) => handleChannelChange("pdv", !!checked)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-primary"
              />
              <span className="text-xs">PDV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={channels.cardapioDigital}
                onCheckedChange={(checked) => handleChannelChange("cardapioDigital", !!checked)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-primary"
              />
              <span className="text-xs">Cardápio Digital</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

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
              {editId ? "Editar categoria" : "Nova categoria"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestor de cardápio › Categoria Padrão (Universal)
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-card border-b border-border px-4">
        <div className="flex gap-2 overflow-x-auto max-w-3xl mx-auto py-1">
          {STANDARD_STEPS.map((step) => {
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
                  "flex items-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap border-b-2",
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
                  {step.id}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 bg-background">
        <div className="max-w-3xl mx-auto p-4">
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {currentStep}. {STANDARD_STEPS.find(s => s.id === currentStep)?.label}
            </h2>

            {currentStep === 1 && CategoryFormContent}

            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Has Sizes Toggle */}
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium text-foreground">Produtos têm tamanhos diferentes?</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasSizes === "yes" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setHasSizes("yes")}
                      >
                        {hasSizes === "yes" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasSizes === "no" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setHasSizes("no")}
                      >
                        {hasSizes === "no" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>

                {hasSizes === "no" && (
                  <div className="p-3 bg-muted rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground">
                      ✓ Os produtos terão preço único, definido no cadastro de cada item.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exemplos: Bebidas, Sobremesas, Pratos únicos
                    </p>
                  </div>
                )}

                {hasSizes === "yes" && (
                  <>
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-xs text-foreground">
                        💡 Defina os tamanhos disponíveis. Exemplos:
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

            {currentStep === 3 && (
              <div className="space-y-4">
                {/* Has Option Groups Toggle */}
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium text-foreground">Tem opções de personalização?</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasOptionGroups === "yes" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setHasOptionGroups("yes")}
                      >
                        {hasOptionGroups === "yes" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasOptionGroups === "no" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setHasOptionGroups("no")}
                      >
                        {hasOptionGroups === "no" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>

                {hasOptionGroups === "no" && (
                  <div className="p-3 bg-muted rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground">
                      ✓ Os produtos desta categoria não terão opções de personalização.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O cliente apenas escolhe o produto e adiciona ao carrinho.
                    </p>
                  </div>
                )}

                {hasOptionGroups === "yes" && (
                  <>
                    {/* Templates */}
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-xs text-foreground font-medium mb-2">
                        ✨ Escolha um tipo de grupo para adicionar:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {GROUP_TEMPLATES.map((template, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addOptionGroup(template)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-accent border border-border rounded-lg text-xs font-medium transition-colors"
                          >
                            <span>{template.icon}</span>
                            <span>{template.name}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Cada grupo aparece como uma seção na tela de personalização do produto
                      </p>
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
                      <div className="text-center py-8 text-muted-foreground">
                        <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum grupo criado ainda</p>
                        <p className="text-xs">Clique em um dos tipos acima para começar</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
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

          {currentStep < STANDARD_STEPS.length ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !name.trim()}
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
