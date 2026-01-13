import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Info, 
  MapPin, 
  Clock, 
  Phone, 
  Instagram, 
  Navigation, 
  Timer,
  ChevronDown,
  MessageCircle,
  Download,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseSchedule, isStoreOpenNow, getFormattedWeekSchedule } from "@/lib/scheduleUtils";
import { ReviewsSection } from "./ReviewsSection";

interface StoreData {
  id: string;
  name: string;
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
}

interface AboutSectionProps {
  store: StoreData;
  expanded?: boolean;
}

export default function AboutSection({ store, expanded = false }: AboutSectionProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Parse schedule
  const schedule = useMemo(() => parseSchedule(store.schedule), [store.schedule]);
  
  // Get status using schedule
  const { isOpen, statusText } = useMemo(() => {
    return isStoreOpenNow(
      schedule, 
      store.is_open_override,
      store.open_hour ?? undefined,
      store.close_hour ?? undefined
    );
  }, [schedule, store.is_open_override, store.open_hour, store.close_hour]);

  // Get weekly schedule
  const weekSchedule = useMemo(() => getFormattedWeekSchedule(schedule), [schedule]);

  const prepTime = store.estimated_prep_time ?? 25;
  const deliveryTime = store.estimated_delivery_time ?? 20;
  const estimatedTimeText = `${prepTime}-${prepTime + deliveryTime} min`;

  const openWhatsApp = () => {
    if (store.whatsapp) {
      const cleanPhone = store.whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    }
  };

  const openInstagram = () => {
    if (store.instagram) {
      const handle = store.instagram.replace("@", "");
      window.open(`https://instagram.com/${handle}`, "_blank");
    }
  };

  // Extract Google Maps embed URL
  const getGoogleMapsEmbedUrl = () => {
    if (!store.google_maps_link) return null;
    
    // If it's already an embed URL
    if (store.google_maps_link.includes("/embed")) {
      return store.google_maps_link;
    }
    
    // Extract place ID or coordinates from various Google Maps URL formats
    const url = store.google_maps_link;
    
    // Try to extract coordinates
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[2];
      return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1spt-BR!2sbr!4v1`;
    }
    
    // For place URLs, use the address instead
    if (store.address) {
      return `https://www.google.com/maps/embed/v1/place?key=&q=${encodeURIComponent(store.address)}`;
    }
    
    return null;
  };

  const hasContent = store.about_us || store.address || store.phone || store.whatsapp || store.instagram;

  if (!hasContent) return null;

  // Conteúdo interno da seção "Sobre nós"
  const content = (
    <div className={`${expanded ? '' : 'mt-3'} p-4 bg-surface rounded-xl border border-border/50 space-y-4`}>
      {/* Status e Horário */}
      <div className="flex flex-wrap gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isOpen 
            ? 'bg-success/10 text-success' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-success' : 'bg-destructive'}`} />
          {statusText}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground">
          <Timer className="w-3.5 h-3.5" />
          {estimatedTimeText}
        </div>
      </div>

      {/* Horários da Semana */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Horários de Funcionamento
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {weekSchedule.map((day) => (
            <div
              key={day.day}
              className={`text-xs p-2 rounded-lg ${
                day.isOpen 
                  ? 'bg-success/10 text-success' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="font-medium">{day.day}</span>
              <div className="mt-0.5 space-y-0.5">
                {day.isOpen ? (
                  day.slots.map((slot, i) => (
                    <div key={i} className="text-[10px]">
                      {String(slot.open).padStart(2, "0")}:00 - {String(slot.close).padStart(2, "0")}:00
                    </div>
                  ))
                ) : (
                  <span className="text-[10px]">Fechado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sobre */}
      {store.about_us && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-foreground">Sobre</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {store.about_us}
          </p>
        </div>
      )}

      {/* Endereço com Mapa */}
      {store.address && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Endereço
          </h3>
          <p className="text-sm text-muted-foreground">{store.address}</p>
          
          {store.google_maps_link && (
            <div className="mt-3 space-y-2">
              {/* Mapa incorporado */}
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border/50 bg-muted">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(store.address)}&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização"
                />
              </div>
              <a
                href={store.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Abrir no Google Maps
              </a>
            </div>
          )}
        </div>
      )}

      {/* Contato */}
      {(store.phone || store.whatsapp || store.instagram) && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Contato</h3>
          <div className="flex flex-wrap gap-2">
            {store.phone && (
              <a
                href={`tel:${store.phone}`}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
              >
                <Phone className="w-4 h-4 text-primary" />
                {store.phone}
              </a>
            )}
            {store.whatsapp && (
              <Button
                variant="outline"
                size="sm"
                onClick={openWhatsApp}
                className="gap-2 bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20 hover:text-green-700"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            )}
            {store.instagram && (
              <Button
                variant="outline"
                size="sm"
                onClick={openInstagram}
                className="gap-2 bg-pink-500/10 border-pink-500/30 text-pink-600 hover:bg-pink-500/20 hover:text-pink-700"
              >
                <Instagram className="w-4 h-4" />
                {store.instagram.startsWith("@") ? store.instagram : `@${store.instagram}`}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Avaliações */}
      <div className="space-y-2 pt-4 border-t border-border/50">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          Avaliações
        </h3>
        <ReviewsSection storeId={store.id} storeName={store.name} />
      </div>

      {/* Instalar App */}
      <div className="pt-4 border-t border-border/50">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate("/instalar")}
        >
          <Download className="w-4 h-4" />
          Instalar App
        </Button>
      </div>
    </div>
  );

  // Se expanded = true, mostra direto sem botão
  if (expanded) {
    return content;
  }

  return (
    <div className="px-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-surface rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Sobre nós</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
