import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Smartphone, Share, Plus, MoreVertical, Download,
  CheckCircle, ArrowDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type DeviceType = "ios" | "android" | "desktop" | "unknown";

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) return "desktop";
  return "unknown";
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceType>("unknown");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setDevice(detectDevice());
    
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-green-600" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-3">App Instalado!</h1>
          <p className="text-muted-foreground mb-6">
            O Anotô já está instalado no seu dispositivo. Você pode acessá-lo pela tela inicial.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            Voltar ao início
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-lg"
        >
          <Smartphone className="w-10 h-10 text-primary" />
        </motion.div>
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold mb-2"
        >
          Instalar Anotô
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Adicione o app à sua tela inicial para acesso rápido
        </motion.p>
      </div>

      {/* Benefits */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-6 mb-8"
      >
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold">Por que instalar?</h2>
          <div className="space-y-3">
            {[
              "Acesso rápido pela tela inicial",
              "Experiência em tela cheia",
              "Carregamento mais rápido",
              "Receba notificações de pedidos",
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Install Instructions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 mb-8"
      >
        {/* Android with prompt */}
        {device === "android" && deferredPrompt && (
          <Button 
            onClick={handleInstallClick} 
            size="lg" 
            className="w-full h-14 text-lg gap-3"
          >
            <Download className="w-5 h-5" />
            Instalar Agora
          </Button>
        )}

        {/* iOS Instructions */}
        {device === "ios" && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
            <h2 className="font-semibold flex items-center gap-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" 
                alt="Apple" 
                className="w-4 h-4 dark:invert"
              />
              iPhone / iPad
            </h2>
            
            <div className="space-y-4">
              <Step 
                number={1} 
                icon={<Share className="w-5 h-5" />}
                title="Toque em Compartilhar"
                description="No Safari, toque no ícone de compartilhar na barra inferior"
              />
              <Step 
                number={2} 
                icon={<Plus className="w-5 h-5" />}
                title='Selecione "Adicionar à Tela de Início"'
                description="Role para baixo e toque na opção"
              />
              <Step 
                number={3} 
                icon={<CheckCircle className="w-5 h-5" />}
                title='Toque em "Adicionar"'
                description="Confirme no canto superior direito"
              />
            </div>
            
            <div className="flex justify-center pt-2">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowDown className="w-6 h-6 text-primary" />
              </motion.div>
            </div>
          </div>
        )}

        {/* Android Instructions (without prompt) */}
        {device === "android" && !deferredPrompt && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
            <h2 className="font-semibold flex items-center gap-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" 
                alt="Android" 
                className="w-5 h-5"
              />
              Android
            </h2>
            
            <div className="space-y-4">
              <Step 
                number={1} 
                icon={<MoreVertical className="w-5 h-5" />}
                title="Toque no menu (⋮)"
                description="No Chrome, toque nos três pontos no canto superior direito"
              />
              <Step 
                number={2} 
                icon={<Download className="w-5 h-5" />}
                title='Selecione "Instalar app" ou "Adicionar à tela inicial"'
                description="A opção pode variar conforme o navegador"
              />
              <Step 
                number={3} 
                icon={<CheckCircle className="w-5 h-5" />}
                title="Confirme a instalação"
                description="Toque em Instalar no pop-up"
              />
            </div>
          </div>
        )}

        {/* Desktop Instructions */}
        {device === "desktop" && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
            <h2 className="font-semibold">Computador</h2>
            
            <div className="space-y-4">
              <Step 
                number={1} 
                icon={<Download className="w-5 h-5" />}
                title="Clique no ícone de instalação"
                description="Na barra de endereço do Chrome, clique no ícone ⊕ ou 📥"
              />
              <Step 
                number={2} 
                icon={<CheckCircle className="w-5 h-5" />}
                title='Clique em "Instalar"'
                description="Confirme no pop-up que aparecer"
              />
            </div>

            {deferredPrompt && (
              <Button 
                onClick={handleInstallClick} 
                size="lg" 
                className="w-full h-12 gap-2 mt-4"
              >
                <Download className="w-5 h-5" />
                Instalar Agora
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* Back button */}
      <div className="px-6 pb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="w-full"
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}

function Step({ 
  number, 
  icon, 
  title, 
  description 
}: { 
  number: number; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
          {number}
        </div>
        {number < 3 && <div className="w-0.5 h-8 bg-border mt-2" />}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-primary">{icon}</div>
          <h3 className="font-medium">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}