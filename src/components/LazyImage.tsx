// Lazy Image Component - Optimized image loading with placeholder
import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fallbackSrc?: string;
  width?: number | string;
  height?: number | string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  loading?: "lazy" | "eager";
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImageComponent = ({
  src,
  alt,
  className,
  placeholderClassName,
  fallbackSrc = "/placeholder.svg",
  width,
  height,
  objectFit = "cover",
  loading = "lazy",
  onLoad,
  onError,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (loading === "eager") {
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      { rootMargin: "100px" }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading]);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? fallbackSrc : src;

  return (
    <div
      ref={imgRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {/* Placeholder / Skeleton */}
      {!isLoaded && (
        <div
          className={cn(
            "absolute inset-0 bg-muted animate-pulse",
            placeholderClassName
          )}
        />
      )}
      
      {/* Actual Image */}
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{ objectFit }}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
          decoding="async"
          draggable={false}
        />
      )}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const LazyImage = memo(LazyImageComponent);

// Responsive image with srcset support
interface ResponsiveImageProps extends LazyImageProps {
  srcSet?: { src: string; width: number }[];
  sizes?: string;
}

export const ResponsiveImage = memo(({
  src,
  alt,
  className,
  srcSet,
  sizes = "100vw",
  ...props
}: ResponsiveImageProps) => {
  const srcSetString = srcSet
    ?.map(({ src, width }) => `${src} ${width}w`)
    .join(", ");

  if (!srcSet) {
    return <LazyImage src={src} alt={alt} className={className} {...props} />;
  }

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={className}
      {...props}
    />
  );
});

ResponsiveImage.displayName = "ResponsiveImage";

// Background image component
interface BackgroundImageProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
}

export const BackgroundImage = memo(({
  src,
  className,
  children,
  overlay = false,
  overlayOpacity = 0.5,
}: BackgroundImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [src]);

  return (
    <div
      className={cn("relative bg-muted", className)}
      style={{
        backgroundImage: isLoaded ? `url(${src})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

BackgroundImage.displayName = "BackgroundImage";

export default LazyImage;
