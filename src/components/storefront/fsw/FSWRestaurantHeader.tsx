import { ChevronLeft, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  about_us: string | null;
}

interface FSWRestaurantHeaderProps {
  store: Store;
}

const FSWRestaurantHeader = ({ store }: FSWRestaurantHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative h-[250px] w-full">
      {/* Background Image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: store.banner_url
            ? `url(${store.banner_url})`
            : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)",
        }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Navigation buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white/90 backdrop-blur-sm border-0 hover:bg-white shadow-lg"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-5 h-5 text-gray-800" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white/90 backdrop-blur-sm border-0 hover:bg-white shadow-lg"
          onClick={() => navigate(`/cardapio/${store.slug}/pedidos`)}
        >
          <ScrollText className="w-5 h-5 text-gray-800" />
        </Button>
      </div>

      {/* Store info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        {/* Avatar */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-12">
          <div className="w-20 h-20 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {store.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Text content - centered below avatar */}
        <div className="text-center pt-12">
          <h1 className="text-xl font-bold text-white">{store.name}</h1>
          {store.about_us && (
            <p className="text-sm text-gray-300 mt-1 line-clamp-1">{store.about_us}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FSWRestaurantHeader;
