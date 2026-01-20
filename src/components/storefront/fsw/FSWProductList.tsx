import FSWProductCard from "./FSWProductCard";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price?: number | null;
  image_url: string | null;
}

interface FSWProductListProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const FSWProductList = ({ products, onProductClick }: FSWProductListProps) => {
  return (
    <div className="flex flex-col gap-3 px-4 pb-32">
      {products.map((product) => (
        <FSWProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
        />
      ))}
      
      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Nenhum produto encontrado nesta categoria.</p>
        </div>
      )}
    </div>
  );
};

export default FSWProductList;
