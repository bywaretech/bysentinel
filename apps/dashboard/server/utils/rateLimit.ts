interface Bucket {
  count: number;
  resetAt: number;
}

/** Process-local fixed-window limiter for the Nitro server (login throttling). */
class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
  ) {}

  hit(key: string): boolean {
    const now = Date.now();
    const current = this.buckets.get(key);
    const bucket =
      current && current.resetAt > now ? current : { count: 0, resetAt: now + this.windowMs };
    bucket.count += 1;
    this.buckets.set(key, bucket);
    // Opportunistic cleanup so the map does not grow unbounded.
    if (this.buckets.size > 5000) {
      for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
    }
    return bucket.count <= this.limit;
  }
}

// 10 login attempts per minute per client IP, shared across requests.
export const loginRateLimiter = new FixedWindowRateLimiter(10);
