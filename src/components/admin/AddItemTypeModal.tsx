// Modal for choosing between creating a new item or adding flavors/variations to existing products
import { useState, useEffect } from "react";
import { 
  Plus, 
  Settings2, 
  ChevronRight,
  Loader2,
  UtensilsCrossed,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CustomizableProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  category_id: string;
  category_name?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  categoryId: string;
  categoryName: string;
  onNewItem: () => void;
  onAddToProduct: (product: CustomizableProduct) => void;
}

export function AddItemTypeModal({
  open,
  onOpenChange,
  storeId,
  categoryId,
  categoryName,
  onNewItem,
  onAddToProduct,
}: Props) {
  const [step, setStep] = useState<"choice" | "select-product">("choice");
  const [loading, setLoading] = useState(false);
  const [customizableProducts, setCustomizableProducts] = useState<CustomizableProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      setStep("choice");
      setSearchTerm("");
    }
  }, [open]);

  const loadCustomizableProducts = async () => {
    setLoading(true);
    try {
      // Load all products with display_mode = 'customization' from this category
      const { data: products, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          image_url,
          price,
          category_id,
          categories!inner(name)
        `)
        .eq("store_id", storeId)
        .eq("category_id", categoryId)
        .eq("display_mode", "customization")
        .eq("is_available", true)
        .order("name");

      if (error) throw error;

      const formattedProducts: CustomizableProduct[] = (products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image_url: p.image_url,
        price: p.price,
        category_id: p.category_id,
        category_name: p.categories?.name,
      }));

      setCustomizableProducts(formattedProducts);
    } catch (error) {
      console.error("Error loading customizable products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseAddFlavor = () => {
    loadCustomizableProducts();
    setStep("select-product");
  };

  const filteredProducts = customizableProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "choice" 
              ? `Adicionar em "${categoryName}"` 
              : "Selecionar Item Base"
            }
          </DialogTitle>
        </DialogHeader>

        {step === "choice" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground mb-4">
              O que você deseja adicionar?
            </p>

            {/* Option 1: New Item */}
            <button
              onClick={() => {
                onOpenChange(false);
                onNewItem();
              }}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "border-border hover:border-primary hover:bg-primary/5",
                "flex items-start gap-4"
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">Novo Item</div>
                <p className="text-xs text-muted-foreground">
                  Criar um novo produto base (ex: Açaí 300ml, X-Burger, Prato Executivo)
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
            </button>

            {/* Option 2: Add Flavors/Variations */}
            <button
              onClick={handleChooseAddFlavor}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "border-border hover:border-blue-500 hover:bg-blue-50",
                "flex items-start gap-4"
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Settings2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">
                  Adicionar Sabor(es) / Variações
                </div>
                <p className="text-xs text-muted-foreground">
                  Adicionar opções a um item existente com tela de personalização
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
            </button>
          </div>
        )}

        {step === "select-product" && (
          <div className="space-y-4 pt-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : customizableProducts.length === 0 ? (
              <div className="text-center py-8">
                <Settings2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Nenhum item com personalização
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Primeiro crie um item com "Tela de personalização" ativada
                </p>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onNewItem();
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar Novo Item
                </Button>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Products List */}
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Nenhum item encontrado
                    </p>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          onAddToProduct(product);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-all",
                          "border-border hover:border-primary hover:bg-primary/5",
                          "flex items-center gap-3"
                        )}
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatPrice(product.price)}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Personalização
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>

                {/* Back Button */}
                <Button
                  variant="outline"
                  onClick={() => setStep("choice")}
                  className="w-full"
                >
                  Voltar
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
