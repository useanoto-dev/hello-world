import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameSelector from "./games/GameSelector";
import anotoMascot from "@/assets/anoto-mascot.png";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => {
    // Safe check for SSR and iOS Safari
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial state
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  // Don't render anything if online
  if (isOnline) return null;

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-auto"
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          
          {/* Content */}
          <div className="relative max-w-sm text-center z-10 py-6">
            {/* Mascot with sad animation */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="relative mx-auto mb-4"
            >
              <motion.img
                src={anotoMascot}
                alt="Sem conexão"
                className="w-24 h-24 mx-auto object-contain opacity-70 grayscale-[30%]"
                animate={{ 
                  rotate: [-3, 3, -3],
                  y: [0, -3, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
              {/* Wifi off badge */}
              <motion.div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <WifiOff className="w-4 h-4 text-destructive" />
              </motion.div>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold mb-2"
            >
              Sem conexão
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground mb-4"
            >
              Este app precisa de internet para funcionar.
            </motion.p>

            {/* Mini games */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <GameSelector />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4"
            >
              <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Tentar reconectar
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
