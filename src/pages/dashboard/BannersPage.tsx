import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Image, MoreVertical, Edit, Trash2, GripVertical, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImageUpload } from "@/components/ui/image-upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

export default function BannersPage() {
  const { store } = useOutletContext<{ store: { id: string } }>();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    if (store?.id) {
      loadBanners();
    }
  }, [store?.id]);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("store_id", store.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error loading banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const openNewBannerDialog = () => {
    setEditingBanner(null);
    setFormTitle("");
    setFormImageUrl(null);
    setFormLinkUrl("");
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditBannerDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setFormTitle(banner.title || "");
    setFormImageUrl(banner.image_url);
    setFormLinkUrl(banner.link_url || "");
    setFormIsActive(banner.is_active);
    setDialogOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!formImageUrl) {
      toast.error("Adicione uma imagem para o banner");
      return;
    }

    setSaving(true);
    try {
      const bannerData = {
        store_id: store.id,
        title: formTitle || null,
        image_url: formImageUrl,
        link_url: formLinkUrl || null,
        is_active: formIsActive,
        display_order: editingBanner?.display_order ?? banners.length,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(bannerData)
          .eq("id", editingBanner.id);

        if (error) throw error;
        toast.success("Banner atualizado!");
      } else {
        const { error } = await supabase.from("banners").insert(bannerData);

        if (error) throw error;
        toast.success("Banner criado!");
      }

      setDialogOpen(false);
      loadBanners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (banner: Banner) => {
    if (!confirm(`Deseja excluir o banner "${banner.title || "sem título"}"?`)) return;

    try {
      const { error } = await supabase.from("banners").delete().eq("id", banner.id);

      if (error) throw error;
      toast.success("Banner excluído!");
      loadBanners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);

      if (error) throw error;

      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: !b.is_active } : b))
      );

      toast.success(banner.is_active ? "Banner desativado" : "Banner ativado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Banners Promocionais</h1>
          <p className="text-[11px] text-muted-foreground">{banners.length} banners cadastrados</p>
        </div>
        <Button onClick={openNewBannerDialog} size="sm" className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Novo Banner
        </Button>
      </div>

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum banner cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione banners promocionais para destacar ofertas e novidades
          </p>
          <Button onClick={openNewBannerDialog} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar primeiro banner
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="flex">
                {/* Image Preview */}
                <div className="w-48 h-32 flex-shrink-0 bg-muted">
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Banner"}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">
                      {banner.title || "Sem título"}
                    </h3>
                    {banner.link_url && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <LinkIcon className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{banner.link_url}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">
                        {banner.is_active ? "Ativo" : "Inativo"}
                      </span>
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={() => toggleActive(banner)}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditBannerDialog(banner)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteBanner(banner)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Banner Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Editar Banner" : "Novo Banner"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem do Banner *</Label>
              <ImageUpload
                value={formImageUrl}
                onChange={setFormImageUrl}
                bucket="banners"
                folder={store.id}
                aspectRatio="banner"
                placeholder="Clique para adicionar banner (1200x400 recomendado)"
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                placeholder="Ex: Promoção de Verão"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label>Link (opcional)</Label>
              <Input
                placeholder="https://..."
                value={formLinkUrl}
                onChange={(e) => setFormLinkUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL para onde o cliente será redirecionado ao clicar no banner
              </p>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <Label>Banner ativo</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBanner} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
