import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Megaphone, Check, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  image_url?: string | null;
}

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  is_active: boolean;
}

interface AddNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  banners: Banner[];
  onAddCategory: (category: Category) => void;
  onAddPromotion: (banner: Banner) => void;
}

export default function AddNodeModal({
  open,
  onOpenChange,
  categories,
  banners,
  onAddCategory,
  onAddPromotion,
}: AddNodeModalProps) {
  const [activeTab, setActiveTab] = useState<'category' | 'promotion'>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  const handleConfirm = () => {
    if (activeTab === 'category' && selectedCategory) {
      onAddCategory(selectedCategory);
      setSelectedCategory(null);
      onOpenChange(false);
    } else if (activeTab === 'promotion' && selectedBanner) {
      onAddPromotion(selectedBanner);
      setSelectedBanner(null);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setSelectedBanner(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Adicionar ao Fluxo
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'category' | 'promotion')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="category" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Categoria
            </TabsTrigger>
            <TabsTrigger value="promotion" className="gap-2">
              <Megaphone className="w-4 h-4" />
              Promoção
            </TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Selecione uma categoria para redirecionar o cliente ao final do fluxo
            </p>
            <ScrollArea className="h-[250px] pr-2">
              <div className="grid gap-2">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma categoria disponível
                  </div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                        selectedCategory?.id === category.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {category.image_url ? (
                          <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{category.icon || '📁'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground">Redirecionar para esta categoria</p>
                      </div>
                      {selectedCategory?.id === category.id && (
                        <Check className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="promotion" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Selecione um banner para exibir no fluxo. Ao ativar no fluxo, ele será ativado automaticamente.
            </p>
            <ScrollArea className="h-[250px] pr-2">
              <div className="grid gap-2">
                {banners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum banner disponível
                    <p className="text-xs mt-1">Crie banners em Marketing → Banners</p>
                  </div>
                ) : (
                  banners.map((banner) => (
                    <button
                      key={banner.id}
                      onClick={() => setSelectedBanner(banner)}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg border-2 text-left transition-all",
                        selectedBanner?.id === banner.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="w-20 h-12 rounded-md bg-muted shrink-0 overflow-hidden">
                        <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{banner.title || 'Banner sem título'}</p>
                          <Badge variant={banner.is_active ? "default" : "secondary"} className="text-[10px] h-4">
                            {banner.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {banner.is_active ? 'Exibir banner promocional' : 'Será ativado ao adicionar'}
                        </p>
                      </div>
                      {selectedBanner?.id === banner.id && (
                        <Check className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={(activeTab === 'category' && !selectedCategory) || (activeTab === 'promotion' && !selectedBanner)}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}