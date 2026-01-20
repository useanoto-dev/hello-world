// Product Grid - FSW Style - Horizontal Card Layout
import { formatCurrency } from "@/lib/formatters";
import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
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

// Memoized product card - FSW style
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
    <Card
      className={`
        flex items-center gap-3 p-3 bg-card rounded-lg border border-border 
        hover:shadow-md transition-shadow cursor-pointer
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      onClick={() => !isOutOfStock && onClick()}
    >
      {/* Product Image */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading={index < 6 ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            🍽️
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold bg-destructive px-1.5 py-0.5 rounded">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground text-[15px] truncate">
            {product.name}
          </h3>
          
          {/* Favorite Button */}
          {showFavorites && !isVirtual && (
            <div onClick={(e) => e.stopPropagation()}>
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
                size="sm"
              />
            </div>
          )}
        </div>
        
        {product.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mt-0.5">
            {product.description}
          </p>
        )}
        
        {/* Price */}
        <div className="mt-2 flex items-center gap-2">
          {hasPromo && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.price)}
            </span>
          )}
          <span className="font-bold text-primary text-base">
            {formatCurrency(displayPrice)}
          </span>
        </div>
      </div>
    </Card>
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
      <div className="text-center py-12 text-muted-foreground px-4">
        <div className="text-4xl mb-2">{filterFavoritesOnly ? "💔" : "🍽️"}</div>
        <p className="font-medium">
          {filterFavoritesOnly ? "Nenhum favorito ainda" : "Nenhum produto encontrado nesta categoria."}
        </p>
        {filterFavoritesOnly && (
          <p className="text-sm text-muted-foreground mt-1">Toque no ❤️ para adicionar favoritos</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-5 pb-24">
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
