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

export default function StorefrontHeader({ store }: StorefrontHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Cover Image - exactly like reference */}
      <div className="relative h-48 w-full">
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={store.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-primary" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back button - white circle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 bg-white/90 hover:bg-white rounded-full shadow-md"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5 text-gray-800" />
        </Button>

        {/* Orders button - white circle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 bg-white/90 hover:bg-white rounded-full shadow-md"
          onClick={() => navigate(`/cardapio/${store.slug}/meus-pedidos`)}
        >
          <ScrollText className="h-5 w-5 text-gray-800" />
        </Button>
      </div>

      {/* Store info with avatar - FSW layout: avatar left, text beside it */}
      <div className="relative -mt-10 px-5">
        <div className="flex items-end gap-3">
          {/* Avatar - circular, overlapping banner */}
          <div className="h-20 w-20 rounded-full border-4 border-white shadow-lg overflow-hidden flex-shrink-0 bg-white">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-primary">
                <span className="text-2xl font-bold text-primary-foreground">
                  {store.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          {/* Store name and description - to the right of avatar */}
          <div className="pb-1">
            <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
            {store.about_us && (
              <p className="text-sm text-muted-foreground line-clamp-1">{store.about_us}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
