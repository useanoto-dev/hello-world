import { ChevronLeft, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  open_hour: number | null;
  close_hour: number | null;
  is_open_override: boolean | null;
  about_us: string | null;
  estimated_prep_time: number | null;
  estimated_delivery_time: number | null;
  google_maps_link: string | null;
  schedule?: unknown;
  min_order_value?: number | null;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

interface StorefrontHeaderProps {
  store: StoreData;
  reviewStats?: ReviewStats;
  onRatingClick?: () => void;
}

export default function StorefrontHeader({ store, reviewStats, onRatingClick }: StorefrontHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="relative h-48 w-full">
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={store.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div 
            className="h-full w-full"
            style={{
              background: store.primary_color 
                ? `linear-gradient(135deg, ${store.primary_color} 0%, ${store.primary_color}cc 100%)`
                : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)"
            }}
          />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 bg-white/90 hover:bg-white rounded-full"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Orders button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 bg-white/90 hover:bg-white rounded-full"
          onClick={() => navigate(`/cardapio/${store.slug}/meus-pedidos`)}
        >
          <ScrollText className="h-5 w-5" />
        </Button>
      </div>

      {/* Store info with avatar */}
      <div className="relative -mt-12 px-5">
        <div className="flex items-end gap-3">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-full border-4 border-white shadow-lg overflow-hidden flex-shrink-0 bg-white">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div 
                className="h-full w-full flex items-center justify-center"
                style={{
                  backgroundColor: store.primary_color || "hsl(var(--primary))"
                }}
              >
                <span className="text-2xl font-bold text-white">
                  {store.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          {/* Store name and description */}
          <div className="pb-2">
            <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
            {store.about_us && (
              <p className="text-sm text-muted-foreground">{store.about_us}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
