import { ChevronLeft, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useStoreStatus } from "@/contexts/StoreStatusContext";

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
  const { isOpen } = useStoreStatus();

  return (
    <div className="relative">
      {/* Cover Image - rounded corners on desktop */}
      <div className="relative h-48 w-full md:mx-auto md:max-w-5xl md:mt-4 md:rounded-2xl md:overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:rounded-2xl" />
        
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
      <div className="relative -mt-10 px-5 md:max-w-5xl md:mx-auto">
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
          
          {/* Store name, description and status badge */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{store.name}</h1>
              {/* Open/Closed Badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                isOpen 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                {isOpen ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            {store.about_us && (
              <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{store.about_us}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
