import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, MapPin, DollarSign, Clock, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
  min_order_value: number;
  estimated_time: number;
  is_active: boolean;
  display_order: number;
}

interface DeliveryAreasManagerProps {
  storeId: string;
}

export function DeliveryAreasManager({ storeId }: DeliveryAreasManagerProps) {
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newArea, setNewArea] = useState({
    name: "",
    fee: 5,
    min_order_value: 0,
    estimated_time: 30,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchAreas();
  }, [storeId]);

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_areas")
        .select("*")
        .eq("store_id", storeId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error("Error fetching delivery areas:", error);
      toast.error("Erro ao carregar áreas de entrega");
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = async () => {
    if (!newArea.name.trim()) {
      toast.error("Digite o nome da área");
      return;
    }

    setSaving("new");
    try {
      const { error } = await supabase
        .from("delivery_areas")
        .insert({
          store_id: storeId,
          name: newArea.name,
          fee: newArea.fee,
          min_order_value: newArea.min_order_value,
          estimated_time: newArea.estimated_time,
          display_order: areas.length,
        });

      if (error) throw error;
      
      toast.success("Área adicionada!");
      setNewArea({ name: "", fee: 5, min_order_value: 0, estimated_time: 30 });
      setShowAddForm(false);
      fetchAreas();
    } catch (error) {
      console.error("Error adding area:", error);
      toast.error("Erro ao adicionar área");
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateArea = async (area: DeliveryArea) => {
    setSaving(area.id);
    try {
      const { error } = await supabase
        .from("delivery_areas")
        .update({
          name: area.name,
          fee: area.fee,
          min_order_value: area.min_order_value,
          estimated_time: area.estimated_time,
          is_active: area.is_active,
        })
        .eq("id", area.id);

      if (error) throw error;
      toast.success("Área atualizada!");
    } catch (error) {
      console.error("Error updating area:", error);
      toast.error("Erro ao atualizar área");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm("Deseja excluir esta área de entrega?")) return;

    setSaving(id);
    try {
      const { error } = await supabase
        .from("delivery_areas")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Área removida!");
      setAreas(areas.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting area:", error);
      toast.error("Erro ao remover área");
    } finally {
      setSaving(null);
    }
  };

  const updateLocalArea = (id: string, updates: Partial<DeliveryArea>) => {
    setAreas(areas.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lista de Áreas */}
      <AnimatePresence mode="popLayout">
        {areas.map((area) => (
          <motion.div
            key={area.id}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-lg border ${area.is_active ? 'bg-card border-border' : 'bg-muted/50 border-muted'}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 text-muted-foreground cursor-grab">
                <GripVertical className="w-4 h-4" />
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={area.name}
                    onChange={(e) => updateLocalArea(area.id, { name: e.target.value })}
                    onBlur={() => handleUpdateArea(area)}
                    placeholder="Nome da área/bairro"
                    className="max-w-[200px] h-9 font-medium"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={area.is_active}
                      onCheckedChange={(checked) => {
                        updateLocalArea(area.id, { is_active: checked });
                        handleUpdateArea({ ...area, is_active: checked });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteArea(area.id)}
                      disabled={saving === area.id}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      {saving === area.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Taxa
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={area.fee}
                      onChange={(e) => updateLocalArea(area.id, { fee: parseFloat(e.target.value) || 0 })}
                      onBlur={() => handleUpdateArea(area)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Pedido Mín.
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={area.min_order_value}
                      onChange={(e) => updateLocalArea(area.id, { min_order_value: parseFloat(e.target.value) || 0 })}
                      onBlur={() => handleUpdateArea(area)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Tempo (min)
                    </Label>
                    <Input
                      type="number"
                      min={5}
                      step={5}
                      value={area.estimated_time}
                      onChange={(e) => updateLocalArea(area.id, { estimated_time: parseInt(e.target.value) || 30 })}
                      onBlur={() => handleUpdateArea(area)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Formulário para adicionar */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 space-y-3">
              <Input
                value={newArea.name}
                onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                placeholder="Nome da área/bairro (ex: Centro, Zona Sul)"
                className="h-10"
              />
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Taxa de Entrega (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newArea.fee}
                    onChange={(e) => setNewArea({ ...newArea, fee: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pedido Mínimo (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={newArea.min_order_value}
                    onChange={(e) => setNewArea({ ...newArea, min_order_value: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo Estimado (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={newArea.estimated_time}
                    onChange={(e) => setNewArea({ ...newArea, estimated_time: parseInt(e.target.value) || 30 })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddArea}
                  disabled={saving === "new" || !newArea.name.trim()}
                  className="flex-1"
                >
                  {saving === "new" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar Área
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão para mostrar formulário */}
      {!showAddForm && (
        <Button
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Área de Entrega
        </Button>
      )}

      {areas.length === 0 && !showAddForm && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nenhuma área cadastrada. A taxa padrão da loja será usada.
        </p>
      )}
    </div>
  );
}
