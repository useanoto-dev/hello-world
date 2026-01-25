import { motion } from "framer-motion";
import anotoMascot from "@/assets/anoto-mascot.png";

export default function StorefrontSkeleton() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center light font-storefront">
      {/* Centered Professional Loading Animation */}
      <motion.div
        className="flex flex-col items-center justify-center gap-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Mascot with bounce animation */}
        <motion.div
          className="relative"
          animate={{ 
            y: [0, -12, 0],
          }}
          transition={{ 
            duration: 1.2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <motion.img
            src={anotoMascot}
            alt="Carregando..."
            className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-lg"
            animate={{ 
              rotate: [-3, 3, -3]
            }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          {/* Subtle glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/10 blur-xl -z-10"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        </motion.div>

        {/* Animated progress bar */}
        <div className="w-32 md:w-40 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            style={{ width: "50%" }}
          />
        </div>

        {/* Loading text with fade */}
        <motion.p 
          className="text-sm text-muted-foreground font-medium"
          animate={{ 
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          Carregando cardápio...
        </motion.p>
      </motion.div>
    </div>
  );
}
