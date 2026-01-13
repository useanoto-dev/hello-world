import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Flame, Star, Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
}

interface FeaturedProductsProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export default function FeaturedProducts({ products, onProductClick }: FeaturedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  const getDiscountPercent = (price: number, promoPrice: number) => {
    return Math.round(((price - promoPrice) / price) * 100);
  };

  return (
    <section className="py-4 sm:py-5">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3 sm:px-4 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-yellow-500/10">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">Destaques</h2>
          <p className="text-xs text-muted-foreground">Os mais pedidos</p>
        </div>
      </div>
      
      {/* Horizontal Scroll */}
      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide px-3 sm:px-4 -mr-3 sm:-mr-4">
        {products.map((product, index) => {
          const hasPromo = product.promotional_price !== null;
          const discountPercent = hasPromo 
            ? getDiscountPercent(product.price, product.promotional_price!) 
            : 0;
          const displayPrice = hasPromo ? product.promotional_price! : product.price;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: index * 0.08, type: "spring", stiffness: 150 }}
              className="flex-shrink-0"
            >
              <button
                onClick={() => onProductClick(product)}
                aria-label={`Adicionar ${product.name}`}
                className="relative w-36 sm:w-44 text-left overflow-hidden rounded-2xl
                  bg-surface/80 backdrop-blur-md border border-border/50
                  shadow-md hover:shadow-xl hover:shadow-primary/10
                  hover:border-primary/40 hover:scale-[1.03]
                  transition-all duration-300 ease-out group
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {/* Featured Star Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <div className="w-7 h-7 rounded-full bg-yellow-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Star className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>

                {/* Promo Badge */}
                {hasPromo && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className="flex items-center gap-1 bg-destructive/90 backdrop-blur-sm text-destructive-foreground px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                      <Flame className="w-3 h-3" />
                      -{discountPercent}%
                    </div>
                  </div>
                )}

                {/* Product Image */}
                <div className="aspect-square bg-muted/50 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={`Foto de ${product.name}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/40">
                      🍕
                    </div>
                  )}
                </div>

                {/* Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Product Info */}
                <div className="p-3 relative">
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
                    {product.name}
                  </h3>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      {hasPromo && (
                        <span className="text-xs text-muted-foreground line-through block">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                      <span className={`text-sm font-bold ${hasPromo ? 'text-destructive' : 'text-primary'}`}>
                        {formatCurrency(displayPrice)}
                      </span>
                    </div>

                    {/* Add Button */}
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-200">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
