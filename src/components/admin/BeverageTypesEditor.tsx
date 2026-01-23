// Beverage Types Editor - Step 3 for Beverages category
import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

export interface BeverageType {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  isActive: boolean;
  productCount?: number;
}

interface BeverageTypesEditorProps {
  beverageTypes: BeverageType[];
  setBeverageTypes: React.Dispatch<React.SetStateAction<BeverageType[]>>;
  storeId: string;
  categoryId?: string | null;
  onManageProducts?: (typeId: string, typeName: string) => void;
}

// Sortable Item Component
function SortableBeverageTypeItem({
  type,
  onUpdate,
  onRemove,
  canRemove,
  storeId,
  onManageProducts,
}: {
  type: BeverageType;
  onUpdate: (id: string, field: keyof BeverageType, value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  storeId: string;
  onManageProducts?: (typeId: string, typeName: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${storeId}/beverage-types/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      onUpdate(type.id, "imageUrl", urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
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
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          className="touch-none text-muted-foreground hover:text-foreground cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Image upload */}
        <label className="relative w-10 h-10 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors">
          {type.imageUrl ? (
            <img src={type.imageUrl} alt={type.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleImageUpload}
            disabled={uploading}
          />
        </label>

        <div className="flex-1">
          <Input
            value={type.name}
            onChange={(e) => onUpdate(type.id, "name", e.target.value)}
            placeholder="Ex: Refrigerantes, Sucos, Cervejas"
            className="h-9"
          />
        </div>

        {/* Product count badge */}
        {type.productCount !== undefined && type.productCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {type.productCount} {type.productCount === 1 ? 'produto' : 'produtos'}
          </span>
        )}

        {/* Manage products button */}
        {onManageProducts && type.name.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onManageProducts(type.id, type.name)}
            className="text-primary hover:text-primary/80"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        <Switch
          checked={type.isActive}
          onCheckedChange={(checked) => onUpdate(type.id, "isActive", checked)}
        />

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(type.id)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function BeverageTypesEditor({
  beverageTypes,
  setBeverageTypes,
  storeId,
  categoryId,
  onManageProducts,
}: BeverageTypesEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addBeverageType = () => {
    setBeverageTypes([
      ...beverageTypes,
      {
        id: crypto.randomUUID(),
        name: "",
        isActive: true,
      },
    ]);
  };

  const updateBeverageType = (id: string, field: keyof BeverageType, value: any) => {
    setBeverageTypes(beverageTypes.map((t) =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const removeBeverageType = (id: string) => {
    setBeverageTypes(beverageTypes.filter((t) => t.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBeverageTypes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-xs text-foreground">
          🥤 Adicione os tipos de bebidas que você oferece:
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          • Refrigerantes, Sucos, Águas, Cervejas, Drinks, etc.<br/>
          • Depois você pode adicionar os produtos em cada tipo.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={beverageTypes.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {beverageTypes.map((type) => (
              <SortableBeverageTypeItem
                key={type.id}
                type={type}
                onUpdate={updateBeverageType}
                onRemove={removeBeverageType}
                canRemove={beverageTypes.length > 1}
                storeId={storeId}
                onManageProducts={onManageProducts}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addBeverageType}
        className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Adicionar tipo de bebida
      </button>
    </div>
  );
}
