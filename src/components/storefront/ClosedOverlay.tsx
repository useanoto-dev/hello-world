import { Clock } from "lucide-react";
import { motion } from "framer-motion";

interface ClosedOverlayProps {
  nextOpeningTime: string | null;
}

export default function ClosedOverlay({ nextOpeningTime }: ClosedOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
      style={{ top: "200px" }} // Leave header visible
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl text-center max-w-sm mx-4 pointer-events-auto"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          Estamos Fechados
        </h2>
        
        <p className="text-muted-foreground mb-4">
          {nextOpeningTime 
            ? `${nextOpeningTime}`
            : "Fechado por tempo indeterminado"}
        </p>
        
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          Você pode navegar pelo cardápio, mas não é possível fazer pedidos no momento.
        </div>
      </motion.div>
    </motion.div>
  );
}
