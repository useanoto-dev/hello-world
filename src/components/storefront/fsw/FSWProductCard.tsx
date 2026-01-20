import { Card } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price?: number | null;
  image_url: string | null;
}

interface FSWProductCardProps {
  product: Product;
  onClick: () => void;
}

const FSWProductCard = ({ product, onClick }: FSWProductCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const displayPrice = product.promotional_price || product.price;
  const hasPromo = product.promotional_price && product.promotional_price < product.price;

  return (
    <Card
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Product Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            🍽️
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-[15px] truncate">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mt-0.5">
            {product.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {hasPromo && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
          <span className="font-bold text-primary text-base">
            {formatPrice(displayPrice)}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default FSWProductCard;
