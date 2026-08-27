export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

export interface LoginRateLimiter {
  check(key: string): RateLimitDecision;
  reset?(): void;
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS = 10;

const localLimiter: LoginRateLimiter = {
  check(key) {
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    current.count += 1;
    return { allowed: current.count <= MAX_ATTEMPTS, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1_000) };
  },
  reset() {
    buckets.clear();
  },
};

let activeLimiter: LoginRateLimiter = localLimiter;

export function configureLoginRateLimiter(limiter: LoginRateLimiter): void {
  activeLimiter = limiter;
}

export function checkLoginRateLimit(key: string): RateLimitDecision {
  return activeLimiter.check(key);
}

export function resetLoginRateLimit(): void {
  activeLimiter.reset?.();
  localLimiter.reset?.();
}
