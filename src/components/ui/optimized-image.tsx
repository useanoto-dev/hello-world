import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { isImageCached, preloadImage } from "@/lib/imageCache";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: "square" | "video" | "auto";
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  className,
  fallbackIcon,
  aspectRatio = "square",
  priority = false,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  // Show immediately if cached, otherwise wait for load
  const [isReady, setIsReady] = useState(() => !!src && isImageCached(src));

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

  // Preload and cache on mount
  useEffect(() => {
    if (!src || hasError) return;
    
    if (isImageCached(src)) {
      setIsReady(true);
      return;
    }

    preloadImage(src).then(() => {
      setIsReady(true);
    });
  }, [src, hasError]);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
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

  // Show placeholder while loading (very brief, usually instant from cache)
  if (!isReady) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          aspectClass,
          className
        )}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="eager" // Always eager since we pre-cache
      decoding="sync" // Sync for instant display from cache
      onError={() => setHasError(true)}
      className={cn(
        "w-full h-full object-cover",
        aspectRatio === "auto" ? "h-full" : aspectClass,
        className
      )}
    />
  );
}
