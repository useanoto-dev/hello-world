import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  current: number;
  retry_after?: number;
}

interface RateLimitOptions {
  maxRequests?: number;
  windowSeconds?: number;
}

/**
 * Rate limiter utility for Edge Functions
 * Uses the check_rate_limit database function for distributed rate limiting
 * 
 * @example
 * ```ts
 * import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
 * 
 * const clientIP = req.headers.get("x-forwarded-for") || "unknown";
 * const result = await checkRateLimit(supabase, clientIP, "my-endpoint", { maxRequests: 10, windowSeconds: 60 });
 * 
 * if (!result.allowed) {
 *   return new Response("Too Many Requests", { 
 *     status: 429, 
 *     headers: getRateLimitHeaders(result) 
 *   });
 * }
 * ```
 */
export async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  key: string,
  endpoint: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { maxRequests = 100, windowSeconds = 60 } = options;

  try {
    // Actually call the function using a direct query
    const result = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: key,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    } as unknown as undefined);

    if (result.error) {
      console.error("Rate limit check failed:", result.error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, remaining: maxRequests, current: 0 };
    }

    return result.data as unknown as RateLimitResult;
  } catch (err) {
    console.error("Rate limit error:", err);
    // Fail open
    return { allowed: true, remaining: maxRequests, current: 0 };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Current": String(result.current),
  };

  if (!result.allowed && result.retry_after) {
    headers["Retry-After"] = String(result.retry_after);
  }

  return headers;
}

/**
 * Get client identifier for rate limiting
 * Uses X-Forwarded-For header or falls back to a hash of user agent
 */
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from headers
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Get first IP in chain
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to user agent hash
  const userAgent = req.headers.get("user-agent") || "unknown";
  return `ua-${hashString(userAgent)}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Rate limit presets for common use cases
 */
export const RATE_LIMIT_PRESETS = {
  // Very strict - login attempts, password reset
  strict: { maxRequests: 5, windowSeconds: 300 }, // 5 per 5 minutes
  
  // Standard API calls
  standard: { maxRequests: 100, windowSeconds: 60 }, // 100 per minute
  
  // Generous - public data reads
  generous: { maxRequests: 300, windowSeconds: 60 }, // 300 per minute
  
  // WhatsApp/SMS - prevent spam
  messaging: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
  
  // Order creation
  orders: { maxRequests: 20, windowSeconds: 60 }, // 20 per minute
} as const;
