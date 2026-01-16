// Standard Category Editor - For hamburgers, açaí, beverages, desserts, etc.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, AlertCircle, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  { id: 3, label: "Adicionais" },
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

interface AddonPrice {
  sizeId: string;
  sizeName: string;
  enabled: boolean;
  price: string;
}

interface StandardAddon {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  maxQuantity: number;
  isActive: boolean;
  prices: AddonPrice[];
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

// Sortable Addon Item
function SortableAddonItem({ 
  addon, 
  onUpdate, 
  onUpdatePrice,
  onRemove, 
  canRemove 
}: { 
  addon: StandardAddon; 
  onUpdate: (id: string, field: keyof StandardAddon, value: any) => void;
  onUpdatePrice: (addonId: string, sizeId: string, field: "enabled" | "price", value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: addon.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3 p-3">
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
              value={addon.name}
              onChange={(e) => onUpdate(addon.id, "name", e.target.value)}
              placeholder="Ex: Bacon Extra, Queijo Cheddar"
              className="h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Obrigatório:</Label>
            <Switch
              checked={addon.isRequired}
              onCheckedChange={(checked) => onUpdate(addon.id, "isRequired", checked)}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Máx:</Label>
            <Input
              type="number"
              min="1"
              max="99"
              value={addon.maxQuantity}
              onChange={(e) => onUpdate(addon.id, "maxQuantity", Math.max(1, parseInt(e.target.value) || 1))}
              className="h-8 w-14 text-center text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={addon.isActive}
              onCheckedChange={(checked) => onUpdate(addon.id, "isActive", checked)}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(addon.id)}
            disabled={!canRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Preço por tamanho:</p>
            <div className="flex flex-wrap gap-2">
              {addon.prices.map((priceItem) => (
                <div key={priceItem.sizeId} className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                  <Checkbox
                    checked={priceItem.enabled}
                    onCheckedChange={(checked) => onUpdatePrice(addon.id, priceItem.sizeId, "enabled", !!checked)}
                    className="h-4 w-4 data-[state=checked]:bg-primary"
                  />
                  <span className="text-xs font-medium min-w-16">{priceItem.sizeName || "Tamanho"}</span>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceItem.price}
                      onChange={(e) => onUpdatePrice(addon.id, priceItem.sizeId, "price", e.target.value)}
                      className="h-7 w-20 pl-7 text-xs"
                      disabled={!priceItem.enabled}
                    />
                  </div>
                </div>
              ))}
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

  // Addons state
  const [hasAddons, setHasAddons] = useState<"yes" | "no">("no");
  const [addons, setAddons] = useState<StandardAddon[]>([]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Create addon prices based on sizes
  const createAddonPrices = (): AddonPrice[] => {
    return sizes.map(size => ({
      sizeId: size.id,
      sizeName: size.name || "Tamanho",
      enabled: true,
      price: "0"
    }));
  };

  // Add addon
  const addAddon = () => {
    setAddons(prev => [...prev, {
      id: crypto.randomUUID(),
      name: "",
      isRequired: false,
      maxQuantity: 1,
      isActive: true,
      prices: createAddonPrices()
    }]);
  };

  // Remove addon
  const removeAddon = (id: string) => {
    if (addons.length > 1) {
      setAddons(prev => prev.filter(a => a.id !== id));
    }
  };

  // Update addon
  const updateAddon = (id: string, field: keyof StandardAddon, value: any) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Update addon price
  const updateAddonPrice = (addonId: string, sizeId: string, field: "enabled" | "price", value: any) => {
    setAddons(prev => prev.map(addon => {
      if (addon.id !== addonId) return addon;
      return {
        ...addon,
        prices: addon.prices.map(p => p.sizeId === sizeId ? { ...p, [field]: value } : p)
      };
    }));
  };

  // Initialize addon when hasAddons changes to yes
  useEffect(() => {
    if (hasAddons === "yes" && addons.length === 0) {
      addAddon();
    }
  }, [hasAddons]);

  // Sync addon prices when sizes change
  useEffect(() => {
    if (addons.length > 0) {
      setAddons(prev => prev.map(addon => ({
        ...addon,
        prices: sizes.map(size => {
          const existingPrice = addon.prices.find(p => p.sizeId === size.id);
          return existingPrice 
            ? { ...existingPrice, sizeName: size.name || "Tamanho" }
            : { sizeId: size.id, sizeName: size.name || "Tamanho", enabled: true, price: "0" };
        })
      })));
    }
  }, [sizes]);

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

  const handleAddonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAddons((items) => {
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

      // Save addons if has addons
      if (hasAddons === "yes" && addons.length > 0) {
        const validAddons = addons.filter(a => a.name.trim());
        
        for (let i = 0; i < validAddons.length; i++) {
          const addon = validAddons[i];
          const { data: savedAddon } = await supabase.from("standard_addons").insert({
            store_id: storeId,
            category_id: category.id,
            name: addon.name.trim(),
            description: addon.description || null,
            is_required: addon.isRequired,
            max_quantity: addon.maxQuantity,
            is_active: addon.isActive,
            display_order: i,
          }).select().single();

          if (savedAddon && hasSizes === "yes") {
            // Save addon prices per size
            const { data: savedSizes } = await supabase
              .from("standard_sizes")
              .select("id, name")
              .eq("category_id", category.id);

            if (savedSizes) {
              for (const savedSize of savedSizes) {
                const priceData = addon.prices.find(p => p.sizeName === savedSize.name);
                if (priceData?.enabled) {
                  await supabase.from("standard_addon_prices").insert({
                    addon_id: savedAddon.id,
                    size_id: savedSize.id,
                    price: parseFloat(priceData.price) || 0,
                    is_available: true,
                  });
                }
              }
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
          placeholder="Ex.: Hambúrgueres, Açaí, Bebidas"
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
              Gestor de cardápio › Categoria Padrão
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
                  <Label className="text-sm font-medium text-foreground">Tem tamanhos?</Label>
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
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Os produtos desta categoria não terão variação de tamanho. O preço será definido no cadastro do produto.
                  </p>
                )}

                {hasSizes === "yes" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Defina os tamanhos disponíveis para os produtos desta categoria.
                    </p>

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
                {/* Has Addons Toggle */}
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium text-foreground">Tem adicionais?</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasAddons === "yes" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setHasAddons("yes")}
                      >
                        {hasAddons === "yes" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          hasAddons === "no" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                        onClick={() => setHasAddons("no")}
                      >
                        {hasAddons === "no" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>

                {hasAddons === "no" && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Os produtos desta categoria não terão adicionais disponíveis.
                  </p>
                )}

                {hasAddons === "yes" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Defina os adicionais disponíveis para os produtos desta categoria.
                    </p>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAddonDragEnd}>
                      <SortableContext items={addons.map(a => a.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {addons.map((addon) => (
                            <SortableAddonItem
                              key={addon.id}
                              addon={addon}
                              onUpdate={updateAddon}
                              onUpdatePrice={updateAddonPrice}
                              onRemove={removeAddon}
                              canRemove={addons.length > 1}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <button
                      type="button"
                      onClick={addAddon}
                      className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar adicional
                    </button>
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
