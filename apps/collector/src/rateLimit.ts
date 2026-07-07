export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly clock = Date.now,
  ) {}

  hit(key: string): RateLimitResult {
    const now = this.clock();
    const current = this.buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + this.windowMs };
    bucket.count += 1;
    this.buckets.set(key, bucket);
    return {
      allowed: bucket.count <= this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }
}
