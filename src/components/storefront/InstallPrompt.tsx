import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InstallPrompt() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem("install-prompt-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if already installed as PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsDismissed(true);
      return;
    }

    // Show after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Shake animation after appearing
  useEffect(() => {
    if (!isVisible) return;

    // First shake after 2 seconds of appearing
    const shakeTimer = setTimeout(() => {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 600);
    }, 2000);

    // Repeat shake every 8 seconds
    const intervalTimer = setInterval(() => {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 600);
    }, 8000);

    return () => {
      clearTimeout(shakeTimer);
      clearInterval(intervalTimer);
    };
  }, [isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem("install-prompt-dismissed", "true");
  };

  const handleInstall = () => {
    navigate("/instalar");
  };

  if (isDismissed) return null;

  const shakeAnimation = {
    shake: {
      x: [0, -8, 8, -8, 8, -4, 4, 0],
      rotate: [0, -2, 2, -2, 2, -1, 1, 0],
      transition: { duration: 0.6 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.8 }}
          animate={shouldShake ? "shake" : { y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.8 }}
          variants={shakeAnimation}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:max-w-xs"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-4 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <div className="flex items-start gap-3 pr-6">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"
                animate={shouldShake ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Download className="w-5 h-5 text-primary" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">
                  Instale nosso app
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acesso rápido direto da sua tela inicial
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="flex-1 text-xs"
              >
                Agora não
              </Button>
              <Button
                size="sm"
                onClick={handleInstall}
                className="flex-1 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
