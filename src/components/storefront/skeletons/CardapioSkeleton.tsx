import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function CardapioSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Banner skeleton */}
      <Skeleton className="w-full h-40 rounded-xl mx-4" style={{ width: "calc(100% - 32px)" }} />
      
      {/* Featured products skeleton */}
      <div className="px-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-32">
              <Skeleton className="h-28 w-32 rounded-xl" />
              <Skeleton className="h-4 w-24 mt-2" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Search skeleton */}
      <div className="px-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      
      {/* Filters skeleton */}
      <div className="px-4 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      
      {/* Categories skeleton */}
      <div className="px-4 flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      
      {/* Products grid skeleton */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
