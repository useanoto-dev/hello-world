// Performance optimizations hook - lazy loading, prefetching, caching
import { useEffect, useCallback, useRef } from "react";

// Image lazy loading with intersection observer
export function useLazyImages(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!containerRef.current) return;

    const images = containerRef.current.querySelectorAll("img[data-src]");
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.getAttribute("data-src");
            if (src) {
              img.src = src;
              img.removeAttribute("data-src");
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: "100px" }
    );

    images.forEach((img) => observer.observe(img));

    return () => observer.disconnect();
  }, [containerRef]);
}

// Debounce hook for expensive operations
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Throttle hook for scroll/resize events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

// Prefetch links on hover
export function usePrefetchOnHover() {
  const prefetchedUrls = useRef<Set<string>>(new Set());

  const prefetch = useCallback((url: string) => {
    if (prefetchedUrls.current.has(url)) return;
    
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
    prefetchedUrls.current.add(url);
  }, []);

  return prefetch;
}

// Optimize scroll performance
export function useOptimizedScroll(
  callback: (scrollY: number) => void,
  threshold = 16
) {
  const ticking = useRef(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      lastScrollY.current = window.scrollY;

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          callback(lastScrollY.current);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [callback, threshold]);
}

// Reduce re-renders with stable callbacks
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => callbackRef.current(...args),
    []
  ) as T;
}

// Virtualization helper for long lists
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const scrollTop = useRef(0);
  
  const startIndex = Math.max(0, Math.floor(scrollTop.current / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop.current + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetTop = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((newScrollTop: number) => {
    scrollTop.current = newScrollTop;
  }, []);

  return {
    visibleItems,
    offsetTop,
    totalHeight,
    startIndex,
    endIndex,
    handleScroll,
  };
}

// Resource cleanup on unmount
export function useResourceCleanup(cleanupFn: () => void) {
  const cleanupRef = useRef(cleanupFn);
  
  useEffect(() => {
    cleanupRef.current = cleanupFn;
  }, [cleanupFn]);

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
}

// Memory-efficient data caching
export function useDataCache<T>(key: string, ttl = 5 * 60 * 1000) {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const get = useCallback((cacheKey: string): T | null => {
    const entry = cache.current.get(cacheKey);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > ttl) {
      cache.current.delete(cacheKey);
      return null;
    }
    
    return entry.data;
  }, [ttl]);

  const set = useCallback((cacheKey: string, data: T) => {
    cache.current.set(cacheKey, { data, timestamp: Date.now() });
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
  }, []);

  return { get, set, clear };
}

export default {
  useLazyImages,
  useDebounce,
  useThrottle,
  usePrefetchOnHover,
  useOptimizedScroll,
  useStableCallback,
  useVirtualList,
  useResourceCleanup,
  useDataCache,
};
