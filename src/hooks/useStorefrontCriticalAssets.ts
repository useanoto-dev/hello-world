import { useEffect, useMemo, useState } from "react";
import { preloadImage } from "@/lib/imageCache";

type Params = {
  urls: Array<string | null | undefined>;
  /** Maximum time (ms) to wait before letting UI render anyway. */
  timeoutMs?: number;
};

export function useStorefrontCriticalAssets({ urls, timeoutMs = 1200 }: Params) {
  const [ready, setReady] = useState(false);

  // IMPORTANT: do NOT depend on the array identity, since callers may pass
  // an array literal which changes every render and would cause an infinite loop.
  const urlsKey = useMemo(() => {
    return urls.filter(Boolean).join("\u0000");
    // Depend on primitive values to avoid array identity issues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.length, urls[0], urls[1], urls[2], urls[3], urls[4]]);

  const normalizedUrls = useMemo(() => {
    return Array.from(new Set(urls.filter(Boolean))) as string[];
  }, [urlsKey]);

  useEffect(() => {
    // SSR safety / tests
    if (typeof window === "undefined") {
      setReady(true);
      return;
    }

    if (normalizedUrls.length === 0) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    const timeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    });

    const work = Promise.allSettled(normalizedUrls.map((u) => preloadImage(u))).then(() => {
      // Wait 2 frames to ensure first paint is stable
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });

    Promise.race([work, timeout]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedUrls, timeoutMs]);

  return { ready, count: normalizedUrls.length };
}
