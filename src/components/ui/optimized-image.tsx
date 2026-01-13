import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: "square" | "video" | "auto";
  priority?: boolean;
  width?: number;
  quality?: number;
}

// Get image URL - use original URL (Supabase image transformation may not be enabled)
function getOptimizedUrl(src: string): string {
  return src;
}

export function OptimizedImage({
  src,
  alt,
  className,
  fallbackIcon,
  aspectRatio = "square",
  priority = false,
  width = 400,
  quality = 75,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Memoize the optimized URL
  const optimizedSrc = useMemo(() => {
    if (!src) return null;
    return getOptimizedUrl(src);
  }, [src]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before visible
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

  if (!src || hasError) {
    return (
      <div
        ref={imgRef}
        className={cn(
          "bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#ffffff_0%_50%)_50%/16px_16px] dark:bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)_50%/16px_16px] flex items-center justify-center",
          aspectClass,
          className
        )}
      >
        {fallbackIcon || (
          <span className="text-4xl opacity-30">🍕</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn(
        "relative overflow-hidden bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#ffffff_0%_50%)_50%/16px_16px] dark:bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)_50%/16px_16px]",
        aspectRatio === "auto" ? "h-full" : aspectClass,
        className
      )}
    >
      {/* Blur placeholder - always visible until image loads */}
      <div
        className={cn(
          "absolute inset-0 bg-muted/50 transition-opacity duration-500",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      >
        {/* Animated shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>

      {/* Actual image - only render when in view */}
      {isInView && optimizedSrc && (
        <img
          src={optimizedSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
          )}
        />
      )}
    </div>
  );
}
