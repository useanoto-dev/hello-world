// Beverage Types Grid - Displays beverage types for a category
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { BeverageProductsDrawer } from "./BeverageProductsDrawer";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface BeverageType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number | null;
}

interface BeverageTypesGridProps {
  categoryId: string;
  storeId: string;
  isStoreOpen: boolean;
}

async function fetchBeverageTypes(categoryId: string) {
  const { data, error } = await supabase
    .from("beverage_types")
    .select("id, name, description, icon, image_url, is_active, display_order")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data as BeverageType[];
}

export function BeverageTypesGrid({ categoryId, storeId, isStoreOpen }: BeverageTypesGridProps) {
  const [selectedType, setSelectedType] = useState<BeverageType | null>(null);
  const { addToCart } = useCart();

  const { data: beverageTypes, isLoading } = useQuery({
    queryKey: ["beverage-types", categoryId],
    queryFn: () => fetchBeverageTypes(categoryId),
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000,
  });

  const handleTypeClick = (type: BeverageType) => {
    setSelectedType(type);
  };

  const handleAddToCart = async (product: any) => {
    if (!isStoreOpen) {
      toast.error("Estabelecimento fechado", {
        description: "Não é possível adicionar itens ao carrinho no momento.",
      });
      return;
    }

    const effectivePrice = product.promotional_price !== null && product.promotional_price < product.price
      ? product.promotional_price
      : product.price;

    await addToCart({
      id: product.id,
      name: product.name,
      price: effectivePrice,
      quantity: 1,
      category: "Bebidas",
      image_url: product.image_url,
    });

    toast.success("Adicionado ao carrinho!", {
      description: product.name,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-5 pb-32">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!beverageTypes || beverageTypes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground px-4">
        <div className="text-4xl mb-2">🍹</div>
        <p className="font-medium">Nenhum tipo de bebida cadastrado</p>
        <p className="text-sm mt-1">Configure os tipos na área administrativa</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 px-5 pb-32">
        {beverageTypes.map((type, index) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors font-storefront"
            onClick={() => handleTypeClick(type)}
          >
            {/* Image */}
            <div className="relative h-24 w-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {type.image_url ? (
                <img
                  src={type.image_url}
                  alt={type.name}
                  className="h-full w-full object-cover"
                  loading={index < 6 ? "eager" : "lazy"}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
                  {type.icon || "🍹"}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="font-medium text-foreground line-clamp-1">
                {type.name}
              </h3>
              {type.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {type.description}
                </p>
              )}
              <p className="text-xs text-primary mt-1 font-medium">
                Toque para ver opções →
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Products Drawer */}
      {selectedType && (
        <BeverageProductsDrawer
          open={!!selectedType}
          onClose={() => setSelectedType(null)}
          beverageTypeId={selectedType.id}
          beverageTypeName={selectedType.name}
          storeId={storeId}
          categoryId={categoryId}
          onAddToCart={handleAddToCart}
        />
      )}
    </>
  );
}
