// Product Grid - Anota AI Exact Style
import { formatCurrency } from "@/lib/formatters";
import { memo, useMemo } from "react";
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

// Memoized product card - Anota AI exact style
const ProductCard = memo(function ProductCard({
  product,
  index,
  onClick,
  isFavorite,
  onToggleFavorite,
  showFavorites,
}: {
  product: Product;
  index: number;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  showFavorites: boolean;
}) {
  const hasPromo = product.promotional_price !== null && product.promotional_price < product.price;
  const displayPrice = hasPromo ? product.promotional_price! : product.price;
  const isVirtual = product.isVirtualProduct;
  
  const hasStockControl = product.has_stock_control || product.id.startsWith('inv-');
  const isOutOfStock = hasStockControl && 
    product.stock_quantity !== null && 
    product.stock_quantity !== undefined &&
    product.stock_quantity <= 0;

  return (
    <div
      className={`
        flex items-start justify-between py-4 cursor-pointer
        border-b-2 border-border
        hover:bg-muted/30 transition-colors
        ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !isOutOfStock && onClick()}
    >
      {/* Text Info - Left Side */}
      <div className="flex-1 min-w-0 pr-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground text-[13px] leading-snug uppercase tracking-tight">
          {product.name}
        </h3>
        
        {/* Description */}
        {product.description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
            {product.description}
          </p>
        )}
        
        {/* Price */}
        <p className="mt-1 text-[13px] font-bold text-foreground">
          {hasPromo && (
            <span className="text-muted-foreground line-through font-normal text-[12px] mr-2">
              {formatCurrency(product.price)}
            </span>
          )}
          {formatCurrency(displayPrice)}
        </p>
        
        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <span className="inline-block mt-1.5 text-[11px] font-medium text-destructive">
            Esgotado
          </span>
        )}
        
        {/* Favorite Button - below price */}
        {showFavorites && !isVirtual && (
          <div onClick={(e) => e.stopPropagation()} className="mt-2">
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Image - Right Side, Square with rounded corners */}
      <div className="relative w-[76px] h-[76px] flex-shrink-0 rounded-md overflow-hidden border border-border bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading={index < 6 ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
            🍽️
          </div>
        )}
      </div>
    </div>
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
      <div className="text-center py-12 text-gray-400 px-4">
        <div className="text-4xl mb-2">{filterFavoritesOnly ? "💔" : "🍽️"}</div>
        <p className="font-medium text-gray-600">
          {filterFavoritesOnly ? "Nenhum favorito ainda" : "Nenhum produto encontrado nesta categoria."}
        </p>
        {filterFavoritesOnly && (
          <p className="text-sm text-gray-400 mt-1">Toque no ❤️ para adicionar favoritos</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pb-32 bg-background">
      {displayProducts.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          onClick={() => onProductClick(product)}
          isFavorite={isFavorite(product.id)}
          onToggleFavorite={() => toggleFavorite(product.id)}
          showFavorites={showFavorites}
        />
      ))}
    </div>
  );
}

export default memo(ProductGrid);
