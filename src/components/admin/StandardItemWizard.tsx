// Standard Item Wizard - For adding items to standard categories (açaí, hambúrguer, etc.)
import { useState, useEffect } from "react";
import { Upload, X, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StandardItemWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  storeId: string;
  onSave?: () => void;
  editItem?: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    item_type: string;
    is_premium: boolean;
    is_active: boolean;
  };
}

export function StandardItemWizard({
  open,
  onOpenChange,
  categoryId,
  storeId,
  onSave,
  editItem,
}: StandardItemWizardProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setDescription(editItem.description || "");
      setImageUrl(editItem.image_url || "");
      setIsPremium(editItem.is_premium);
      setIsActive(editItem.is_active);
    } else {
      resetForm();
    }
  }, [editItem, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setIsPremium(false);
    setIsActive(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `standard-items/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error("Error uploading:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const data = {
        store_id: storeId,
        category_id: categoryId,
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl || null,
        item_type: isPremium ? "premium" : "traditional",
        is_premium: isPremium,
        is_active: isActive,
      };

      if (editItem) {
        const { error } = await supabase
          .from("standard_items")
          .update(data)
          .eq("id", editItem.id);

        if (error) throw error;
        toast.success("Item atualizado!");
      } else {
        // Get max display_order
        const { data: existing } = await supabase
          .from("standard_items")
          .select("display_order")
          .eq("category_id", categoryId)
          .order("display_order", { ascending: false })
          .limit(1);

        const maxOrder = existing?.[0]?.display_order ?? -1;

        const { error } = await supabase
          .from("standard_items")
          .insert({ ...data, display_order: maxOrder + 1 });

        if (error) throw error;
        toast.success("Item adicionado!");
      }

      onSave?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Editar Item" : "Adicionar Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagem</Label>
            <div className="relative">
              {imageUrl ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Clique para enviar
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Açaí Tradicional, X-Bacon"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o item..."
              rows={3}
            />
          </div>

          {/* Premium Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div>
                <p className="font-medium text-sm">Item Premium</p>
                <p className="text-xs text-muted-foreground">
                  Destaque especial no cardápio
                </p>
              </div>
            </div>
            <Switch
              checked={isPremium}
              onCheckedChange={setIsPremium}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <p className="font-medium text-sm">Ativo</p>
              <p className="text-xs text-muted-foreground">
                Exibir no cardápio
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading ? "Salvando..." : editItem ? "Atualizar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
