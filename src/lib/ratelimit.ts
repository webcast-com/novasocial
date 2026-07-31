// Lightweight in-memory sliding-window rate limiter.
// Shares the same single-process assumption as the SSE event bus (src/lib/realtime.ts):
// suitable for single-node deployments; swap for Redis when scaling horizontally.

import { NextRequest, NextResponse } from "next/server";

type Bucket = number[]; // timestamps (ms) of recent hits within the window

const globalForRateLimit = globalThis as typeof globalThis & {
  __vibepulseRateLimitBuckets?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> = globalForRateLimit.__vibepulseRateLimitBuckets ?? new Map();

if (!globalForRateLimit.__vibepulseRateLimitBuckets) {
  globalForRateLimit.__vibepulseRateLimitBuckets = buckets;
}

let sweepCounter = 0;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Record a hit for `key` and check it against `limit` hits per `windowMs`.
 */
export function hitRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = [];
    buckets.set(key, bucket);
  }

  // Drop hits outside the window
  while (bucket.length > 0 && bucket[0] <= windowStart) {
    bucket.shift();
  }

  if (bucket.length >= limit) {
    const oldest = bucket[0];
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.push(now);

  // Periodic garbage collection of idle keys so the map does not grow forever.
  if (++sweepCounter % 500 === 0) {
    for (const [k, b] of buckets) {
      while (b.length > 0 && b[0] <= windowStart) b.shift();
      if (b.length === 0) buckets.delete(k);
    }
  }

  return { allowed: true, limit, remaining: limit - bucket.length, retryAfterSeconds: 0 };
}

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      success: false,
      error: `Too many requests. Please slow down and try again in ${result.retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    }
  );
}
