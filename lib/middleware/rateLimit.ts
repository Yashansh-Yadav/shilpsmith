import type { NextRequest } from "next/server";
import { RateLimitError } from "../errors";

// In-memory sliding-window rate limiter. Fine for single-instance dev/staging;
// for serverless / multi-instance production, swap the store for Upstash/Redis.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  // Optional namespace so e.g. login attempts and registration attempts are tracked separately.
  namespace?: string;
}

function getClientIp(request: NextRequest | Request): string {
  const headers = (request as NextRequest).headers ?? new Headers();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  request: NextRequest | Request,
  opts: RateLimitOptions
): void {
  const ip = getClientIp(request);
  const key = `${opts.namespace ?? "default"}:${ip}`;
  const now = Date.now();

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  if (bucket.count >= opts.max) {
    const retryInSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new RateLimitError(
      `Too many requests. Try again in ${retryInSec}s.`
    );
  }

  bucket.count += 1;
}

// Periodic cleanup to keep the map from growing unbounded. Runs only in
// long-lived (non-edge) Node processes; serverless functions will be GCed.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of store) {
      if (b.resetAt < now) store.delete(k);
    }
  }, 60_000).unref?.();
}
