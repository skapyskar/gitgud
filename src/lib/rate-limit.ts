// In-memory sliding-window rate limiter. Single-process only — fine for this
// app's scale, but note it resets on server restart and doesn't share state
// across multiple instances. Good enough to blunt naive brute-forcing of
// login/signup without needing Redis or another external store.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60_000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Returns whether `key` is still within `max` attempts in the trailing `windowMs`. */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client identifier for rate limiting — the usual header chain, no proxy trust config here. */
export function clientKeyFor(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
