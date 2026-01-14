// Product Flavors Manager - For managing flavors/options linked to individual products
import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp,
  Settings2,
  ImagePlus,
  X,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OptionGroup {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  display_order: number;
  is_active: boolean;
  item_layout: string;
  show_item_images: boolean;
}

interface OptionItem {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  additional_price: number;
  promotional_price: number | null;
  display_order: number;
  is_active: boolean;
}

interface Props {
  productId: string;
  storeId: string;
  productName: string;
  onClose: () => void;
}

export function ProductFlavorsManager({ productId, storeId, productName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [items, setItems] = useState<Record<string, OptionItem[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Group modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: "",
    selection_type: "single" as "single" | "multiple",
    is_required: false,
    min_selections: 0,
    max_selections: 1,
    item_layout: "list",
    show_item_images: false,
  });
  
  // Item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OptionItem | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    additional_price: "",
    promotional_price: "",
    image_url: null as string | null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load groups for this product (using product_option_groups table)
      const { data: groupsData, error: groupsError } = await supabase
        .from("product_option_groups")
        .select("*")
        .eq("product_id", productId)
        .eq("store_id", storeId)
        .order("display_order");

      if (groupsError) throw groupsError;
      
      const loadedGroups = (groupsData || []) as OptionGroup[];
      setGroups(loadedGroups);

      // Expand first group by default if exists
      if (loadedGroups.length > 0 && expandedGroups.size === 0) {
        setExpandedGroups(new Set([loadedGroups[0].id]));
      }

      // Load items for all groups
      if (loadedGroups.length > 0) {
        const groupIds = loadedGroups.map(g => g.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from("product_option_items")
          .select("*")
          .in("group_id", groupIds)
          .eq("store_id", storeId)
          .order("display_order");

        if (itemsError) throw itemsError;

        // Group items by group_id
        const itemsByGroup: Record<string, OptionItem[]> = {};
        (itemsData || []).forEach((item: OptionItem) => {
          if (!itemsByGroup[item.group_id]) {
            itemsByGroup[item.group_id] = [];
          }
          itemsByGroup[item.group_id].push(item);
        });
        setItems(itemsByGroup);
      }
    } catch (error) {
      console.error("Error loading option groups:", error);
      toast.error("Erro ao carregar grupos de sabores");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const openGroupModal = (group?: OptionGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        selection_type: group.selection_type,
        is_required: group.is_required,
        min_selections: group.min_selections,
        max_selections: group.max_selections || 1,
        item_layout: group.item_layout,
        show_item_images: group.show_item_images,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        name: "",
        selection_type: "single",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        item_layout: "list",
        show_item_images: true,
      });
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    setSavingGroup(true);
    try {
      const groupData = {
        product_id: productId,
        store_id: storeId,
        name: groupForm.name.trim(),
        selection_type: groupForm.selection_type,
        is_required: groupForm.is_required,
        min_selections: groupForm.is_required ? Math.max(1, groupForm.min_selections) : 0,
        max_selections: groupForm.selection_type === "single" ? 1 : groupForm.max_selections,
        item_layout: groupForm.item_layout,
        show_item_images: groupForm.show_item_images,
      };

      if (editingGroup) {
        const { error } = await supabase
          .from("product_option_groups")
          .update(groupData)
          .eq("id", editingGroup.id);

        if (error) throw error;
        toast.success("Grupo atualizado!");
      } else {
        const maxOrder = Math.max(0, ...groups.map(g => g.display_order || 0));
        const { error } = await supabase
          .from("product_option_groups")
          .insert({ ...groupData, display_order: maxOrder + 1 });

        if (error) throw error;
        toast.success("Grupo criado!");
      }

      setShowGroupModal(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving group:", error);
      toast.error(error.message || "Erro ao salvar grupo");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: OptionGroup) => {
    if (!confirm(`Excluir grupo "${group.name}" e todos os sabores?`)) return;

    try {
      const { error } = await supabase
        .from("product_option_groups")
        .delete()
        .eq("id", group.id);

      if (error) throw error;
      toast.success("Grupo excluído!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir grupo");
    }
  };

  const openItemModal = (groupId: string, item?: OptionItem) => {
    setSelectedGroupId(groupId);
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description || "",
        additional_price: item.additional_price.toFixed(2).replace(".", ","),
        promotional_price: item.promotional_price ? item.promotional_price.toFixed(2).replace(".", ",") : "",
        image_url: item.image_url,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: "",
        description: "",
        additional_price: "0,00",
        promotional_price: "",
        image_url: null,
      });
    }
    setShowItemModal(true);
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `product-flavors/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      
      setItemForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada!");
    } catch (error: any) {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim() || !selectedGroupId) {
      toast.error("Nome do sabor é obrigatório");
      return;
    }

    setSavingItem(true);
    try {
      const price = parseFloat(itemForm.additional_price.replace(",", ".")) || 0;
      const promoPrice = itemForm.promotional_price 
        ? parseFloat(itemForm.promotional_price.replace(",", ".")) 
        : null;
      
      const itemData = {
        group_id: selectedGroupId,
        store_id: storeId,
        name: itemForm.name.trim(),
        description: itemForm.description || null,
        additional_price: price,
        promotional_price: promoPrice,
        image_url: itemForm.image_url,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("product_option_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Sabor atualizado!");
      } else {
        const currentItems = items[selectedGroupId] || [];
        const maxOrder = Math.max(0, ...currentItems.map(i => i.display_order || 0));
        
        const { error } = await supabase
          .from("product_option_items")
          .insert({ ...itemData, display_order: maxOrder + 1 });

        if (error) throw error;
        toast.success("Sabor criado!");
      }

      setShowItemModal(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast.error(error.message || "Erro ao salvar sabor");
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: OptionItem) => {
    if (!confirm(`Excluir "${item.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("product_option_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      toast.success("Sabor excluído!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir sabor");
    }
  };

  const handleToggleItemActive = async (item: OptionItem) => {
    try {
      const { error } = await supabase
        .from("product_option_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar sabor");
    }
  };

  const formatPrice = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseInt(numericValue || "0", 10) / 100;
    return number.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Grupos de Sabores</h3>
          <p className="text-xs text-muted-foreground">
            Produto: {productName}
          </p>
        </div>
        <Button
          onClick={() => openGroupModal()}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Grupo
        </Button>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="text-center py-8 bg-muted/50 rounded-lg border border-dashed border-border">
          <Settings2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Nenhum grupo de sabores criado
          </p>
          <Button
            onClick={() => openGroupModal()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar primeiro grupo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Collapsible
              key={group.id}
              open={expandedGroups.has(group.id)}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                {/* Group Header */}
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{group.name}</span>
                        {group.is_required && (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                            Obrigatório
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {group.selection_type === "single" ? "Escolha única" : "Múltipla escolha"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {items[group.id]?.length || 0} sabores • 
                        {group.selection_type === "multiple" 
                          ? ` Mín: ${group.min_selections}, Máx: ${group.max_selections || "∞"}`
                          : " Selecionar 1"
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGroupModal(group);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {expandedGroups.has(group.id) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* Items */}
                <CollapsibleContent>
                  <div className="border-t border-border p-3 space-y-2 bg-muted/30">
                    {/* Add Item Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-dashed"
                      onClick={() => openItemModal(group.id)}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Sabor
                    </Button>

                    {/* Items List */}
                    {(items[group.id] || []).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border border-border bg-background",
                          !item.is_active && "opacity-50"
                        )}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.promotional_price && item.promotional_price < item.additional_price ? (
                              <>
                                <span className="text-xs text-muted-foreground line-through">
                                  R$ {item.additional_price.toFixed(2).replace(".", ",")}
                                </span>
                                <span className="text-xs font-semibold text-green-600">
                                  R$ {item.promotional_price.toFixed(2).replace(".", ",")}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-primary">
                                R$ {item.additional_price.toFixed(2).replace(".", ",")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={() => handleToggleItemActive(item)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openItemModal(group.id, item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {(!items[group.id] || items[group.id].length === 0) && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Nenhum sabor neste grupo
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Group Modal */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Editar Grupo" : "Novo Grupo de Sabores"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Grupo</Label>
              <Input
                placeholder="Ex: Sabores, Coberturas, Adicionais..."
                value={groupForm.name}
                onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Seleção</Label>
              <Select
                value={groupForm.selection_type}
                onValueChange={(value: "single" | "multiple") => 
                  setGroupForm(prev => ({ ...prev, selection_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Escolha única</SelectItem>
                  <SelectItem value="multiple">Múltipla escolha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Obrigatório</Label>
              <Switch
                checked={groupForm.is_required}
                onCheckedChange={(checked) => 
                  setGroupForm(prev => ({ ...prev, is_required: checked }))
                }
              />
            </div>

            {groupForm.selection_type === "multiple" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mínimo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={groupForm.min_selections}
                    onChange={(e) => 
                      setGroupForm(prev => ({ 
                        ...prev, 
                        min_selections: parseInt(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máximo</Label>
                  <Input
                    type="number"
                    min="1"
                    value={groupForm.max_selections}
                    onChange={(e) => 
                      setGroupForm(prev => ({ 
                        ...prev, 
                        max_selections: parseInt(e.target.value) || 1 
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Layout dos Itens</Label>
              <Select
                value={groupForm.item_layout}
                onValueChange={(value) => 
                  setGroupForm(prev => ({ ...prev, item_layout: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Lista</SelectItem>
                  <SelectItem value="grid-2">Grade 2 colunas</SelectItem>
                  <SelectItem value="grid-3">Grade 3 colunas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Mostrar imagens</Label>
              <Switch
                checked={groupForm.show_item_images}
                onCheckedChange={(checked) => 
                  setGroupForm(prev => ({ ...prev, show_item_images: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGroup} disabled={savingGroup}>
              {savingGroup && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingGroup ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Sabor" : "Novo Sabor"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem (opcional)</Label>
              <div className="flex items-center gap-4">
                {itemForm.image_url ? (
                  <div className="relative">
                    <img
                      src={itemForm.image_url}
                      alt="Preview"
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <button
                      onClick={() => setItemForm(prev => ({ ...prev, image_url: null }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      disabled={uploadingImage}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">
                  Imagem do sabor (máx. 2MB)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Sabor *</Label>
              <Input
                placeholder="Ex: Morango, Chocolate, Tradicional..."
                value={itemForm.name}
                onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Ingredientes ou descrição..."
                value={itemForm.description}
                onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={itemForm.additional_price}
                  onChange={(e) => 
                    setItemForm(prev => ({ 
                      ...prev, 
                      additional_price: formatPrice(e.target.value) 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Promocional (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={itemForm.promotional_price}
                  onChange={(e) => 
                    setItemForm(prev => ({ 
                      ...prev, 
                      promotional_price: e.target.value ? formatPrice(e.target.value) : "" 
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
