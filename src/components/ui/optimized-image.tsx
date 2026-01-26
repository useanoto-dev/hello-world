import { useState } from "react";
import { cn } from "@/lib/utils";

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

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

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

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setHasError(true)}
      className={cn(
        "w-full h-full object-cover",
        aspectRatio === "auto" ? "h-full" : aspectClass,
        className
      )}
    />
  );
}
