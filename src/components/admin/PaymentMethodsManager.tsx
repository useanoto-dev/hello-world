import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Loader2, CreditCard, Banknote, QrCode } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PaymentMethod {
  id: string;
  name: string;
  description: string | null;
  icon_type: string;
  is_active: boolean;
  requires_change: boolean;
  display_order: number;
  store_id: string;
}

const ICON_OPTIONS = [
  { value: "card", label: "Cartão", icon: CreditCard },
  { value: "pix", label: "PIX", icon: QrCode },
  { value: "money", label: "Dinheiro", icon: Banknote },
];

function SortablePaymentMethod({ 
  method, 
  onUpdate, 
  onDelete 
}: { 
  method: PaymentMethod; 
  onUpdate: (id: string, updates: Partial<PaymentMethod>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: method.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = ICON_OPTIONS.find(o => o.value === method.icon_type)?.icon || Banknote;

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-2 text-muted-foreground hover:text-foreground">
          <GripVertical className="w-5 h-5" />
        </button>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <Input
                value={method.name}
                onChange={(e) => onUpdate(method.id, { name: e.target.value })}
                placeholder="Nome do método"
                className="font-semibold"
              />
            </div>
            <Switch
              checked={method.is_active}
              onCheckedChange={(checked) => onUpdate(method.id, { is_active: checked })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input
                value={method.description || ""}
                onChange={(e) => onUpdate(method.id, { description: e.target.value })}
                placeholder="Breve descrição"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ícone</Label>
              <Select value={method.icon_type} onValueChange={(v) => onUpdate(method.id, { icon_type: v })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Switch
                checked={method.requires_change}
                onCheckedChange={(checked) => onUpdate(method.id, { requires_change: checked })}
              />
              Precisa de troco (ex: dinheiro)
            </label>
            <Button variant="ghost" size="sm" onClick={() => onDelete(method.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PAYMENT_METHODS = [
  { name: "Dinheiro", description: "Pagamento em espécie", icon_type: "money", requires_change: true },
  { name: "Cartão de Crédito", description: "Visa, Master, Elo", icon_type: "card", requires_change: false },
  { name: "Cartão de Débito", description: "Visa, Master, Elo", icon_type: "card", requires_change: false },
  { name: "PIX", description: "Pagamento instantâneo", icon_type: "pix", requires_change: false },
];

export function PaymentMethodsManager({ storeId }: { storeId: string }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchMethods();
  }, [storeId]);

  const fetchMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("store_id", storeId)
        .order("display_order");

      if (error) throw error;
      
      // If no methods exist, auto-migrate default ones
      if (!data || data.length === 0) {
        await migrateDefaultMethods();
      } else {
        setMethods(data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast.error("Erro ao carregar formas de pagamento");
      setLoading(false);
    }
  };

  const migrateDefaultMethods = async () => {
    setMigrating(true);
    try {
      const methodsToInsert = DEFAULT_PAYMENT_METHODS.map((m, index) => ({
        store_id: storeId,
        name: m.name,
        description: m.description,
        icon_type: m.icon_type,
        requires_change: m.requires_change,
        is_active: true,
        display_order: index,
      }));

      const { data, error } = await supabase
        .from("payment_methods")
        .insert(methodsToInsert)
        .select();

      if (error) throw error;
      setMethods(data || []);
      toast.success("Formas de pagamento padrão adicionadas!");
    } catch (error) {
      console.error("Error migrating payment methods:", error);
      toast.error("Erro ao adicionar formas de pagamento padrão");
    } finally {
      setMigrating(false);
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const newMethod = {
      store_id: storeId,
      name: "Nova forma de pagamento",
      description: "",
      icon_type: "money",
      is_active: true,
      requires_change: false,
      display_order: methods.length,
    };

    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .insert(newMethod)
        .select()
        .single();

      if (error) throw error;
      setMethods([...methods, data]);
      toast.success("Forma de pagamento adicionada");
    } catch (error) {
      console.error("Error adding payment method:", error);
      toast.error("Erro ao adicionar forma de pagamento");
    }
  };

  const handleUpdate = (id: string, updates: Partial<PaymentMethod>) => {
    setMethods(methods.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setMethods(methods.filter(m => m.id !== id));
      toast.success("Forma de pagamento removida");
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast.error("Erro ao remover forma de pagamento");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = methods.findIndex(m => m.id === active.id);
      const newIndex = methods.findIndex(m => m.id === over.id);
      const newMethods = arrayMove(methods, oldIndex, newIndex).map((m, i) => ({ ...m, display_order: i }));
      setMethods(newMethods);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const method of methods) {
        const { error } = await supabase
          .from("payment_methods")
          .update({
            name: method.name,
            description: method.description,
            icon_type: method.icon_type,
            is_active: method.is_active,
            requires_change: method.requires_change,
            display_order: method.display_order,
          })
          .eq("id", method.id);

        if (error) throw error;
      }
      toast.success("Formas de pagamento salvas!");
    } catch (error) {
      console.error("Error saving payment methods:", error);
      toast.error("Erro ao salvar formas de pagamento");
    } finally {
      setSaving(false);
    }
  };

  if (loading || migrating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          {migrating && <p className="text-sm text-muted-foreground">Configurando formas de pagamento...</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Formas de Pagamento
        </CardTitle>
        <CardDescription>
          Configure as formas de pagamento aceitas pelo seu estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma forma de pagamento cadastrada</p>
            <p className="text-sm">Clique em "Adicionar" para começar</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={methods.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {methods.map(method => (
                  <SortablePaymentMethod
                    key={method.id}
                    method={method}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleAdd} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Forma de Pagamento
          </Button>
          {methods.length > 0 && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
