import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import anotoMascot from "@/assets/anoto-mascot.png";

export default function StorefrontSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Mascot Loading Animation */}
      <div className="flex flex-col items-center justify-center py-12">
        <motion.img
          src={anotoMascot}
          alt="Anotô Mascote"
          className="w-24 h-24 object-contain drop-shadow-lg"
          animate={{ 
            y: [0, -8, 0],
            rotate: [-2, 2, -2]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden mt-4">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-3">Carregando cardápio...</p>
      </div>

      {/* Header Skeleton */}
      <div className="relative">
        <Skeleton className="h-24 w-full rounded-none" />
      </div>

      {/* Category Tabs Skeleton */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
          ))}
        </div>
      </div>

      {/* Product Grid Skeleton */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden border border-border/50">
              <Skeleton className="h-28 w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
