import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Minus, Plus, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Custom drag handle icon (6 dots pattern)
const DragHandle = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 16 20" 
    fill="none" 
    className={className}
    style={{ width: 20, height: 20 }}
  >
    <circle cx="4" cy="4" r="1.5" fill="currentColor" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    <circle cx="4" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    <circle cx="4" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

export interface PizzaSize {
  id: string;
  image: string | null;
  name: string;
  slices: number;
  flavors: number;
  priceModel: "sum" | "average" | "highest";
  isOut: boolean;
  basePrice: number;
}

interface SortablePizzaSizeItemProps {
  size: PizzaSize;
  onUpdate: (id: string, field: keyof PizzaSize, value: any) => void;
  onIncrement: (id: string, field: "slices" | "flavors") => void;
  onDecrement: (id: string, field: "slices" | "flavors") => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function SortablePizzaSizeItem({
  size,
  onUpdate,
  onIncrement,
  onDecrement,
  onRemove,
  canRemove,
}: SortablePizzaSizeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: size.id });

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const fileExt = file.name.split('.').pop();
      const fileName = `pizza-sizes/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      onUpdate(size.id, "image", urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-[#fafafa] border border-[#e1e1e1] rounded-lg p-4 transition-all",
        isDragging && "opacity-50 shadow-lg z-50 ring-2 ring-[#f59e0b]"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-[#d7d8dd] cursor-grab hover:text-[#9d9d9d] active:cursor-grabbing touch-none flex-shrink-0"
        >
          <DragHandle />
        </button>

        {/* Image Upload */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div 
            className="w-14 h-14 bg-white border border-[#e1e1e1] rounded-lg flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-[#f59e0b] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
            ) : size.image ? (
              <img src={size.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30.605 39.2325H33.51C34.98 39.2325 36.1875 38.1125 36.3625 36.6775L39.25 7.8375H30.5V0.75H27.0525V7.8375H18.355L18.88 11.9325C21.8725 12.755 24.6725 14.2425 26.3525 15.8875C28.8725 18.3725 30.605 20.945 30.605 25.145V39.2325ZM0.75 37.4825V35.75H27.0525V37.4825C27.0525 38.445 26.265 39.2325 25.285 39.2325H2.5175C1.5375 39.2325 0.75 38.445 0.75 37.4825ZM27.0525 25.2325C27.0525 11.2325 0.75 11.2325 0.75 25.2325H27.0525ZM0.785 28.75H27.035V32.25H0.785V28.75Z" fill="#5BBCFC"/>
              </svg>
            )}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#5BBCFC] rounded-full flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-1.5 bg-white border border-[#e1e1e1] rounded hover:bg-[#f5f5f5] disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-[#5a5a5a]" />
          </button>
        </div>

        {/* Form Fields - All in one row */}
        <div className="flex-1 flex items-end gap-4 flex-wrap">
          {/* Nome do tamanho */}
          <div className="flex-1 min-w-[150px] space-y-1">
            <Label className="text-xs text-[#5a5a5a]">Nome do tamanho *</Label>
            <Input
              value={size.name}
              onChange={(e) => onUpdate(size.id, "name", e.target.value)}
              placeholder="Ex.: Grande"
              className="h-10 text-sm border-[#e1e1e1] bg-white"
            />
          </div>

          {/* Fatias */}
          <div className="space-y-1">
            <Label className="text-xs text-[#5a5a5a]">Fatias *</Label>
            <div className="flex items-center h-10 border border-[#e1e1e1] rounded-md bg-white">
              <button 
                type="button"
                onClick={() => onDecrement(size.id, "slices")}
                disabled={size.slices <= 1}
                className="px-3 h-full text-[#9d9d9d] hover:text-[#5a5a5a] disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={size.slices}
                onChange={(e) => onUpdate(size.id, "slices", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-10 text-center text-sm border-x border-[#e1e1e1] h-full bg-transparent outline-none"
              />
              <button 
                type="button"
                onClick={() => onIncrement(size.id, "slices")}
                className="px-3 h-full text-[#9d9d9d] hover:text-[#5a5a5a]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sabores permitidos */}
          <div className="space-y-1">
            <Label className="text-xs text-[#5a5a5a]">Sabores permitidos *</Label>
            <div className="flex items-center h-10 border border-[#e1e1e1] rounded-md bg-white">
              <button 
                type="button"
                onClick={() => onDecrement(size.id, "flavors")}
                disabled={size.flavors <= 1}
                className="px-3 h-full text-[#9d9d9d] hover:text-[#5a5a5a] disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={size.flavors}
                onChange={(e) => onUpdate(size.id, "flavors", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-10 text-center text-sm border-x border-[#e1e1e1] h-full bg-transparent outline-none"
              />
              <button 
                type="button"
                onClick={() => onIncrement(size.id, "flavors")}
                className="px-3 h-full text-[#9d9d9d] hover:text-[#5a5a5a]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[#9d9d9d]">até {size.flavors} {size.flavors === 1 ? 'sabor' : 'sabores'}</p>
          </div>

          {/* Preço Base */}
          <div className="space-y-1 min-w-[100px]">
            <Label className="text-xs text-[#5a5a5a]">Preço Base *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9d9d9d]">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={size.basePrice || ""}
                onChange={(e) => onUpdate(size.id, "basePrice", parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="h-10 text-sm border-[#e1e1e1] bg-white pl-10"
              />
            </div>
          </div>

          {/* Precificação */}
          <div className="space-y-1 min-w-[130px]">
            <Label className="text-xs text-[#5a5a5a]">Precificação *</Label>
            <Select 
              value={size.priceModel} 
              onValueChange={(v) => onUpdate(size.id, "priceModel", v)}
            >
              <SelectTrigger className="h-10 text-sm border-[#e1e1e1] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-[#e1e1e1]">
                <SelectItem value="sum">Somatório</SelectItem>
                <SelectItem value="average">Média</SelectItem>
                <SelectItem value="highest">Maior Valor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ativo/Inativo */}
          <div className="flex flex-col items-center gap-1">
            <Label className="text-xs text-[#5a5a5a]">Ativo</Label>
            <Switch
              checked={!size.isOut}
              onCheckedChange={(v) => onUpdate(size.id, "isOut", !v)}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>

        {/* Remove button */}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(size.id)}
            className="p-2 text-[#f15c3b] hover:bg-[#ffebe7] rounded flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
