// Product Grid - Anota AI Style - Text Left, Image Right
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

// Memoized product card - Anota AI style (text left, image right)
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
        border-b border-gray-100 last:border-b-0
        hover:bg-gray-50/50 transition-colors font-storefront
        ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !isOutOfStock && onClick()}
    >
      {/* Text Info - Left Side */}
      <div className="flex-1 min-w-0 pr-4">
        {/* Favorite Button - inline with title on mobile */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-[15px] leading-snug line-clamp-2 uppercase tracking-tight">
              {product.name}
            </h3>
          </div>
          
          {showFavorites && !isVirtual && (
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 -mt-0.5">
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
                size="sm"
              />
            </div>
          )}
        </div>
        
        {product.description && (
          <p className="text-[13px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        )}
        
        {/* Price - Anota AI style: green/teal color */}
        <div className="mt-2 flex items-center gap-2">
          {hasPromo && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
          <span className="text-[15px] font-bold text-emerald-600">
            {formatCurrency(displayPrice)}
          </span>
        </div>
        
        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <span className="inline-block mt-2 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
            Esgotado
          </span>
        )}
      </div>

      {/* Image - Right Side */}
      <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-50">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading={index < 6 ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">
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
    <div className="flex flex-col px-4 pb-32 bg-white">
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
