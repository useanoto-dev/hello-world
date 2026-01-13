import { Store, Clock, MapPin, Phone, Instagram, Map, Star, DollarSign, Share2, Copy, QrCode, Download, Printer, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { parseSchedule, isStoreOpenNow, getTodayHoursText, getFormattedWeekSchedule } from "@/lib/scheduleUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [showQRModal, setShowQRModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [posterColors, setPosterColors] = useState({
    background: "#667eea",
    backgroundEnd: "#764ba2",
    cardBackground: "#ffffff",
    textPrimary: "#1a1a2e",
    textSecondary: "#666666"
  });
  const qrRef = useRef<HTMLDivElement>(null);

  // Parse schedule from store data
  const schedule = useMemo(() => parseSchedule(store.schedule), [store.schedule]);

  // Calculate if store is open using schedule
  const { isOpen, statusText } = useMemo(() => {
    return isStoreOpenNow(
      schedule,
      store.is_open_override,
      store.open_hour ?? undefined,
      store.close_hour ?? undefined
    );
  }, [schedule, store.is_open_override, store.open_hour, store.close_hour]);

  // Format hours for display
  const hoursText = useMemo(() => {
    return getTodayHoursText(schedule, store.open_hour ?? undefined, store.close_hour ?? undefined);
  }, [schedule, store.open_hour, store.close_hour]);

  // Get weekly schedule for display
  const weekSchedule = useMemo(() => getFormattedWeekSchedule(schedule), [schedule]);

  const openInstagram = () => {
    if (store.instagram) {
      const handle = store.instagram.replace("@", "");
      window.open(`https://instagram.com/${handle}`, "_blank");
    }
  };

  const openMaps = () => {
    if (store.google_maps_link) {
      window.open(store.google_maps_link, "_blank");
    } else if (store.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`, "_blank");
    }
  };

  const getStoreUrl = () => {
    return `${window.location.origin}/cardapio/${store.slug}`;
  };

  const shareViaWhatsApp = () => {
    const url = getStoreUrl();
    const text = `Confira o cardápio de ${store.name}! 🍕\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyLink = async () => {
    const url = getStoreUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleNativeShare = async () => {
    const url = getStoreUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: store.name,
          text: `Confira o cardápio de ${store.name}!`,
          url: url,
        });
      } catch {
        // User cancelled or error
      }
    }
  };

  const downloadQRCode = () => {
    if (qrRef.current) {
      const svg = qrRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = `qrcode-${store.slug}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  };

  const printPoster = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const svg = qrRef.current?.querySelector('svg');
      const svgData = svg ? new XMLSerializer().serializeToString(svg) : '';
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cardápio QR Code - ${store.name}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              @page { size: A4; margin: 0; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, ${posterColors.background} 0%, ${posterColors.backgroundEnd} 100%);
                padding: 40px;
                color: white;
              }
              .poster {
                background: ${posterColors.cardBackground};
                border-radius: 24px;
                padding: 60px 40px;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 500px;
                width: 100%;
              }
              .store-name {
                font-size: 32px;
                font-weight: 800;
                color: ${posterColors.textPrimary};
                margin-bottom: 8px;
                line-height: 1.2;
              }
              .subtitle {
                font-size: 18px;
                color: ${posterColors.textSecondary};
                margin-bottom: 32px;
              }
              .qr-container {
                background: #f8f9fa;
                border-radius: 16px;
                padding: 24px;
                display: inline-block;
                margin-bottom: 32px;
              }
              .qr-container svg {
                display: block;
              }
              .instruction {
                font-size: 20px;
                font-weight: 600;
                color: ${posterColors.textPrimary};
                margin-bottom: 8px;
              }
              .instruction-sub {
                font-size: 14px;
                color: ${posterColors.textSecondary};
              }
              .url {
                margin-top: 24px;
                padding: 12px 20px;
                background: #f0f0f0;
                border-radius: 8px;
                font-size: 12px;
                color: #666;
                word-break: break-all;
              }
              @media print {
                body { 
                  background: white;
                  padding: 0;
                }
                .poster {
                  box-shadow: none;
                  border: 2px solid #eee;
                }
              }
            </style>
          </head>
          <body>
            <div class="poster">
              <h1 class="store-name">${store.name}</h1>
              <p class="subtitle">Cardápio Digital</p>
              <div class="qr-container">
                ${svgData}
              </div>
              <p class="instruction">📱 Aponte a câmera do celular</p>
              <p class="instruction-sub">Escaneie o QR Code para ver nosso cardápio completo</p>
              <div class="url">${getStoreUrl()}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <header className="relative bg-white text-gray-900">
      {/* Banner Image - Full width */}
      <div 
        className="h-28 sm:h-36 md:h-44 relative overflow-hidden"
        style={{
          backgroundImage: store.banner_url ? `url(${store.banner_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay for better visibility */}
        <div className="absolute inset-0 bg-black/30" />
        
        {!store.banner_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 flex items-center justify-center">
            <Store className="w-16 h-16 text-primary/40" />
          </div>
        )}
      </div>

      {/* White Card - Overlapping Banner */}
      <div className="relative -mt-8 mx-3 sm:mx-4">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-luxury border border-gray-200 overflow-hidden"
        >

          {/* Store Info Row */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-50 shadow-md border border-gray-200 overflow-hidden flex items-center justify-center">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={`Logo ${store.name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-7 h-7 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Name + Social Icons */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">
                  {store.name}
                </h1>
                
                {/* Social Icons */}
                <div className="flex items-center gap-2 mt-1.5">
                  {store.instagram && (
                    <button
                      onClick={openInstagram}
                      className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      <Instagram className="w-4 h-4 text-white" />
                    </button>
                  )}
                  {(store.google_maps_link || store.address) && (
                    <button
                      onClick={openMaps}
                      className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      <Map className="w-4 h-4 text-white" />
                    </button>
                  )}
                  
                  {/* Share Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                        aria-label="Compartilhar cardápio"
                      >
                        <Share2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      {typeof navigator !== 'undefined' && navigator.share && (
                        <DropdownMenuItem onClick={handleNativeShare} className="gap-2">
                          <Share2 className="w-4 h-4" />
                          Compartilhar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={shareViaWhatsApp} className="gap-2">
                        <Phone className="w-4 h-4 text-green-500" />
                        WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={copyLink} className="gap-2">
                        <Copy className="w-4 h-4" />
                        Copiar link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowQRModal(true)} className="gap-2">
                        <QrCode className="w-4 h-4" />
                        QR Code
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Status Badge - ABERTO/FECHADO */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isOpen 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                    {isOpen ? 'Aberto' : 'Fechado'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-gray-200">
            {/* Min Order */}
            <div className="flex items-center gap-2 px-3 py-3 border-r border-b sm:border-b-0 border-gray-200">
              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Pedido Mínimo</p>
                <p className="text-sm font-semibold text-gray-900">
                  R$ {store.min_order_value?.toFixed(2).replace('.', ',') || '0,00'}
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-center gap-2 px-3 py-3 border-b sm:border-b-0 sm:border-r border-gray-200">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Horário</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{hoursText}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 px-3 py-3 border-r border-gray-200">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Localização</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {store.address?.split(',')[0] || 'Ver mapa'}
                </p>
              </div>
            </div>

            {/* Rating */}
            <button 
              onClick={() => navigate(`/cardapio/${store.slug}/avaliacoes`)}
              className={`flex items-center gap-2 px-3 py-3 hover:bg-amber-50 transition-colors cursor-pointer text-left ${
                reviewStats && reviewStats.totalReviews > 0 ? 'group' : ''
              }`}
            >
              <div className={`relative ${reviewStats && reviewStats.totalReviews > 0 ? 'animate-pulse-glow' : ''}`}>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                {reviewStats && reviewStats.totalReviews > 0 && (
                  <div className="absolute inset-0 w-4 h-4 bg-amber-400/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Avaliação</p>
                <p className={`text-sm font-semibold text-gray-900 ${
                  reviewStats && reviewStats.totalReviews > 0 ? 'group-hover:text-amber-600 transition-colors' : ''
                }`}>
                  {reviewStats && reviewStats.totalReviews > 0 
                    ? `${reviewStats.averageRating.toFixed(1)} (${reviewStats.totalReviews > 99 ? '99+' : reviewStats.totalReviews} av.)`
                    : 'Avaliar'
                  }
                </p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>


      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              QR Code do Cardápio
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="h-8 w-8"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {/* Color Picker Panel */}
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                    <div>
                      <label className="text-xs text-muted-foreground">Fundo Inicial</label>
                      <input
                        type="color"
                        value={posterColors.background}
                        onChange={(e) => setPosterColors(prev => ({ ...prev, background: e.target.value }))}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Fundo Final</label>
                      <input
                        type="color"
                        value={posterColors.backgroundEnd}
                        onChange={(e) => setPosterColors(prev => ({ ...prev, backgroundEnd: e.target.value }))}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Cor do Card</label>
                      <input
                        type="color"
                        value={posterColors.cardBackground}
                        onChange={(e) => setPosterColors(prev => ({ ...prev, cardBackground: e.target.value }))}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Texto Principal</label>
                      <input
                        type="color"
                        value={posterColors.textPrimary}
                        onChange={(e) => setPosterColors(prev => ({ ...prev, textPrimary: e.target.value }))}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* QR Code */}
            <div ref={qrRef} className="p-6 bg-white rounded-2xl shadow-md">
              <QRCodeSVG
                value={getStoreUrl()}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Escaneie para acessar o cardápio
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full">
              <Button onClick={downloadQRCode} variant="outline" className="flex-1 gap-2">
                <Download className="w-4 h-4" />
                Baixar
              </Button>
              <Button onClick={printPoster} className="flex-1 gap-2">
                <Printer className="w-4 h-4" />
                Imprimir Poster
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
