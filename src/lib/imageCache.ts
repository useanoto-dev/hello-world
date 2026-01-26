// Global in-memory image cache for instant loading
const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<void>>();

/**
 * Preloads an image and caches it in memory.
 * Returns immediately if already cached.
 */
export function preloadImage(url: string): Promise<void> {
  if (!url) return Promise.resolve();
  
  // Already cached
  if (imageCache.has(url)) {
    return Promise.resolve();
  }
  
  // Already loading
  if (pendingLoads.has(url)) {
    return pendingLoads.get(url)!;
  }
  
  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.src = url;
    
    const done = () => {
      imageCache.set(url, img);
      pendingLoads.delete(url);
      resolve();
    };
    
    img.onload = done;
    img.onerror = done; // Cache even on error to avoid retries
    
    // Decode for smooth rendering
    if ('decode' in img) {
      img.decode().then(done).catch(done);
    }
  });
  
  pendingLoads.set(url, promise);
  return promise;
}

/**
 * Preloads multiple images in parallel.
 */
export function preloadImages(urls: (string | null | undefined)[]): Promise<void> {
  const validUrls = urls.filter((url): url is string => !!url);
  return Promise.all(validUrls.map(preloadImage)).then(() => {});
}

/**
 * Checks if an image is already cached.
 */
export function isImageCached(url: string): boolean {
  return imageCache.has(url);
}

/**
 * Gets the cached image element (for direct use if needed).
 */
export function getCachedImage(url: string): HTMLImageElement | undefined {
  return imageCache.get(url);
}

/**
 * Clears the entire cache (rarely needed).
 */
export function clearImageCache(): void {
  imageCache.clear();
  pendingLoads.clear();
}

/**
 * Gets cache stats for debugging.
 */
export function getImageCacheStats(): { cached: number; pending: number } {
  return {
    cached: imageCache.size,
    pending: pendingLoads.size,
  };
}
