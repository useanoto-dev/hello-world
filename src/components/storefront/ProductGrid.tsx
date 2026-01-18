// Product Grid - Optimized with memo and reduced animations
import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Settings2, Tag, AlertTriangle } from "lucide-react";
import { useState, useRef, useMemo, useCallback, memo } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { FavoriteButton } from "./FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  isVirtualProduct?: boolean;
  is_featured?: boolean | null;
  primaryOptionId?: string;
  stock_quantity?: number | null;
  min_stock_alert?: number | null;
  has_stock_control?: boolean | null;
}

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  updatedProductIds?: Set<string>;
  storeId?: string;
  showFavorites?: boolean;
  filterFavoritesOnly?: boolean;
}

// Get badge for product
const getBadgeForProduct = (product: Product, index: number): { label: string; color: string; icon?: 'tag' } | null => {
  if (product.promotional_price !== null && product.promotional_price < product.price) {
    const discountPercent = Math.round(((product.price - product.promotional_price) / product.price) * 100);
    return { label: `-${discountPercent}%`, color: "bg-green-500 text-white", icon: 'tag' };
  }
  if (product.is_featured) {
    return { label: "Popular", color: "bg-destructive text-white" };
  }
  if (index % 7 === 0) {
    return { label: "Novidade", color: "bg-success text-white" };
  }
  if (index % 11 === 0) {
    return { label: "Gourmet", color: "bg-purple-500 text-white" };
  }
  return null;
};

// Memoized product card for better performance
const ProductCard = memo(function ProductCard({
  product,
  index,
  onClick,
  isFavorite,
  onToggleFavorite,
  showFavorites,
  isPriceUpdated,
}: {
  product: Product;
  index: number;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  showFavorites: boolean;
  isPriceUpdated: boolean;
}) {
  const hasPromo = product.promotional_price !== null && product.promotional_price < product.price;
  const displayPrice = hasPromo ? product.promotional_price! : product.price;
  const isVirtual = product.isVirtualProduct;
  const badge = getBadgeForProduct(product, index);
  
  const hasStockControl = product.has_stock_control || product.id.startsWith('inv-');
  const isLowStock = hasStockControl && 
    product.stock_quantity !== null && 
    product.stock_quantity !== undefined &&
    product.min_stock_alert !== null &&
    product.min_stock_alert !== undefined &&
    product.stock_quantity <= product.min_stock_alert &&
    product.stock_quantity > 0;
  const isOutOfStock = hasStockControl && 
    product.stock_quantity !== null && 
    product.stock_quantity !== undefined &&
    product.stock_quantity <= 0;

  return (
    <button
      onClick={() => !isOutOfStock && onClick()}
      aria-label={`Adicionar ${product.name}`}
      disabled={isOutOfStock}
      className={`
        w-full text-left bg-white rounded-xl overflow-hidden border border-gray-200
        transition-all duration-200 ease-out
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
        group hover:shadow-lg hover:border-primary/30 active:scale-[0.98]
        ${isPriceUpdated ? 'animate-price-pulse ring-2 ring-success/50' : ''}
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}
      `}
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <OptimizedImage
          src={product.image_url}
          alt={`Foto de ${product.name}`}
          aspectRatio="auto"
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          fallbackIcon={<span className="text-4xl opacity-50">🍽️</span>}
          priority={index < 6}
        />

        {/* Favorite Button */}
        {showFavorites && !isVirtual && (
          <div 
            className="absolute top-2 right-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              size="sm"
            />
          </div>
        )}

        {/* Badge */}
        {badge && (
          <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${badge.color} shadow-sm`}>
            {badge.icon === 'tag' && <Tag className="w-3 h-3" />}
            {badge.label}
          </div>
        )}

        {/* Virtual Product Badge */}
        {isVirtual && (
          <div className={`absolute ${showFavorites ? 'bottom-2 left-2' : 'top-2 right-2'} flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow`}>
            <Settings2 className="w-3 h-3" />
            Montar
          </div>
        )}
        
        {/* Stock Badge */}
        {hasStockControl && product.stock_quantity !== null && product.stock_quantity !== undefined && (
          <div className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ${
            isOutOfStock 
              ? 'bg-red-600 text-white' 
              : isLowStock 
                ? 'bg-amber-500 text-white' 
                : 'bg-black/60 text-white'
          }`}>
            {isOutOfStock ? 'Esgotado' : `${product.stock_quantity} un.`}
          </div>
        )}
        
        {/* Low Stock Warning */}
        {isLowStock && !isOutOfStock && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shadow-sm">
            <AlertTriangle className="w-3 h-3" />
            Últimas!
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-bold bg-red-600 px-3 py-1.5 rounded">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        
        {!isVirtual && product.description && (
          <p className="text-gray-500 text-xs line-clamp-1 mt-1">
            {product.description}
          </p>
        )}
        
        {/* Price */}
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            {hasPromo && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <span className={`text-sm font-bold ${hasPromo ? 'text-green-600' : 'text-primary'}`}>
              {formatCurrency(displayPrice)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
});

function ProductGrid({ 
  products, 
  onProductClick, 
  updatedProductIds,
  storeId,
  showFavorites = true,
  filterFavoritesOnly = false,
}: ProductGridProps) {
  const { isFavorite, toggleFavorite } = useFavorites(storeId);

  // Filter products if showing favorites only
  const displayProducts = useMemo(() => {
    if (!filterFavoritesOnly) return products;
    return products.filter(p => isFavorite(p.id));
  }, [products, filterFavoritesOnly, isFavorite]);

  if (displayProducts.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-3">{filterFavoritesOnly ? "💔" : "😔"}</div>
        <p className="text-lg font-medium text-gray-900">
          {filterFavoritesOnly ? "Nenhum favorito ainda" : "Nada encontrado"}
        </p>
        <p className="text-gray-500 text-sm">
          {filterFavoritesOnly ? "Toque no ❤️ para adicionar favoritos" : "Tente outra categoria"}
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 pb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {displayProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
          >
            <ProductCard
              product={product}
              index={index}
              onClick={() => onProductClick(product)}
              isFavorite={isFavorite(product.id)}
              onToggleFavorite={() => toggleFavorite(product.id)}
              showFavorites={showFavorites}
              isPriceUpdated={updatedProductIds?.has(product.id) || false}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default memo(ProductGrid);
