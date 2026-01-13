import { useState } from "react";
import { Bot, Store, Printer, Bell, Copy, ExternalLink, Download, MessageCircle, X } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  printnode_auto_print?: boolean | null;
  whatsapp?: string | null;
  instagram?: string | null;
}

interface QuickActionButtonsProps {
  store: Store | null;
  onStoreUpdate: (updates: Partial<Store>) => void;
}

// Badge component for ON/OFF status
const StatusBadge = ({ isOn }: { isOn: boolean }) => (
  <span
    className={cn(
      "absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full",
      isOn 
        ? "bg-emerald-500 text-white" 
        : "bg-orange-500 text-white"
    )}
  >
    {isOn ? "ON" : "OFF"}
  </span>
);

// Action button component
const ActionButton = ({
  children,
  onClick,
  isActive,
  showBadge = false,
  badgeOn = false,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  showBadge?: boolean;
  badgeOn?: boolean;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full border-2 transition-all duration-200 shadow-lg backdrop-blur-sm",
      isActive
        ? "bg-primary/10 border-primary text-primary"
        : "bg-card/95 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-card",
      className
    )}
  >
    {children}
    {showBadge && <StatusBadge isOn={badgeOn} />}
  </button>
);

export function QuickActionButtons({ store, onStoreUpdate }: QuickActionButtonsProps) {
  const [isCardapioModalOpen, setIsCardapioModalOpen] = useState(false);
  const [isRobotOpen, setIsRobotOpen] = useState(false);
  
  // Robot/Integrations settings (mock for now)
  const [integrations, setIntegrations] = useState({
    whatsapp: false,
    facebook: false,
    instagram: false,
    callAttendant: true,
  });

  const isRobotActive = integrations.callAttendant;

  const cardapioUrl = store ? `${window.location.origin}/cardapio/${store.slug}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cardapioUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Confira nosso cardápio digital: ${cardapioUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleToggleAutoPrint = async () => {
    if (!store) return;
    const newValue = !store.printnode_auto_print;
    
    const { error } = await supabase
      .from("stores")
      .update({ printnode_auto_print: newValue })
      .eq("id", store.id);

    if (!error) {
      onStoreUpdate({ printnode_auto_print: newValue });
      toast.success(newValue ? "Impressão automática ativada!" : "Impressão automática desativada!");
    }
  };

  const handlePrintQRCode = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${store?.name || "Cardápio"}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
            }
            h1 { font-size: 24px; margin-bottom: 8px; }
            p { color: #666; margin-bottom: 24px; }
            .qr-code { margin-bottom: 16px; }
            .url { font-size: 12px; color: #999; word-break: break-all; max-width: 300px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>CARDÁPIO DIGITAL</h1>
            <p>Escaneie o QR Code para acessar</p>
            <div class="qr-code" id="qr"></div>
            <p class="url">${cardapioUrl}</p>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.createElement('canvas'), '${cardapioUrl}', { width: 200 }, function(err, canvas) {
              if (!err) document.getElementById('qr').appendChild(canvas);
            });
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!store) return null;

  return (
    <>

      {/* Cardápio Drawer */}
      <Drawer open={isCardapioModalOpen} onOpenChange={setIsCardapioModalOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-4 pb-6 pt-2 overflow-y-auto">
            {/* Header with phone mockup */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 mb-4">
              <div className="flex justify-center">
                <div className="w-20 h-32 bg-card rounded-xl shadow-lg border-2 border-foreground/10 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-b from-primary/10 to-background flex flex-col items-center pt-3">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Store className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <p className="text-[6px] font-medium mt-1 text-center px-1 truncate w-full">{store.name}</p>
                    <div className="flex gap-0.5 mt-1">
                      <div className="px-1 py-0.5 bg-primary/20 rounded-full text-[5px] font-medium">Cardápio</div>
                      <div className="px-1 py-0.5 bg-muted rounded-full text-[5px]">Pedidos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-semibold">O link do seu Cardápio Digital</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Copie o link e cole onde quiser para compartilhar!
                </p>
              </div>

              {/* Link Box */}
              <div className="bg-muted/50 rounded-lg px-3 py-2.5 border border-border">
                <p className="text-xs text-foreground truncate font-mono">
                  {cardapioUrl}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="gap-2 h-10"
                  onClick={handleWhatsAppShare}
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar link
                </Button>
                <Button
                  className="gap-2 h-10"
                  onClick={handleCopyLink}
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
              </div>

              {/* Open Cardápio Link */}
              <a
                href={cardapioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-primary hover:underline text-sm py-1"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir cardápio
              </a>

              {/* QR Code Section */}
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2 rounded-lg shrink-0">
                    <QRCodeSVG value={cardapioUrl} size={64} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs leading-tight">CARDÁPIO DIGITAL PARA REDES SOCIAIS</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      Escaneie o QR Code com seu celular e faça seu pedido
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {store.name}
                    </p>
                  </div>
                </div>

                {/* QR Actions */}
                <div className="flex justify-center gap-3 pt-3 mt-3 border-t border-border">
                  <button 
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    onClick={() => {
                      const canvas = document.querySelector(".qr-code-download canvas") as HTMLCanvasElement;
                      if (canvas) {
                        const url = canvas.toDataURL("image/png");
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `qrcode-${store.slug}.png`;
                        a.click();
                      }
                    }}
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button 
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    onClick={handlePrintQRCode}
                  >
                    <Printer className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
