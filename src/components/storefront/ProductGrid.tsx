// Product Grid - FSW Style - Horizontal Card Layout
import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Settings2, Tag, AlertTriangle } from "lucide-react";
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

// Memoized product card - FSW horizontal style
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
  
  const hasStockControl = product.has_stock_control || product.id.startsWith('inv-');
  const isOutOfStock = hasStockControl && 
    product.stock_quantity !== null && 
    product.stock_quantity !== undefined &&
    product.stock_quantity <= 0;

  return (
    <Card
      className={`
        flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 
        hover:shadow-md transition-all duration-200 cursor-pointer
        ${isPriceUpdated ? 'ring-2 ring-green-500/50' : ''}
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      onClick={() => !isOutOfStock && onClick()}
    >
      {/* Product Image */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading={index < 6 ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            🍽️
          </div>
        )}
        
        {/* Virtual Product Badge */}
        {isVirtual && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground shadow">
            <Settings2 className="w-2.5 h-2.5" />
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold bg-red-600 px-1.5 py-0.5 rounded">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-[15px] line-clamp-1">
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
          <p className="text-gray-500 text-sm line-clamp-2 mt-0.5">
            {product.description}
          </p>
        )}
        
        {/* Price */}
        <div className="mt-2 flex items-center gap-2">
          {hasPromo && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
          <span className={`font-bold text-base ${hasPromo ? 'text-green-600' : 'text-primary'}`}>
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
      <div className="text-center py-12 text-gray-500 px-4">
        <div className="text-4xl mb-2">{filterFavoritesOnly ? "💔" : "🍽️"}</div>
        <p className="font-medium">
          {filterFavoritesOnly ? "Nenhum favorito ainda" : "Nenhum produto encontrado nesta categoria."}
        </p>
        {filterFavoritesOnly && (
          <p className="text-sm text-gray-400 mt-1">Toque no ❤️ para adicionar favoritos</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-32">
      {displayProducts.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.2 }}
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
  );
}

export default memo(ProductGrid);
