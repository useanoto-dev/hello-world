import { useEffect, useMemo, useState } from "react";

type Params = {
  urls: Array<string | null | undefined>;
  /** Maximum time (ms) to wait before letting UI render anyway. */
  timeoutMs?: number;
};

async function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;

    const done = () => resolve();

    // Best-effort: decode if available (avoids layout showing before decode).
    // decode() can throw for cross-origin images; still resolve.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (img as HTMLImageElement & { decode?: () => Promise<void> }).decode?.().then(done).catch(done);

    img.onload = done;
    img.onerror = done;
  });
}

export function useStorefrontCriticalAssets({ urls, timeoutMs = 1200 }: Params) {
  const [ready, setReady] = useState(false);

  const normalizedUrls = useMemo(() => {
    return Array.from(new Set(urls.filter(Boolean))) as string[];
  }, [urls]);

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
