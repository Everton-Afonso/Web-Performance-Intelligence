/**
 * Simple in-memory fixed-window rate limiter (RNF-14 / section 12.1).
 * Keeps the public API protected without external dependencies in V1.
 */

import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  /** key per client (defaults to IP) */
  keyGenerator?: (req: Request) => string;
  message?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests } = options;
  const keyGenerator = options.keyGenerator ?? ((req: Request) => req.ip ?? "unknown");
  const message = options.message ?? "Muitas requisições. Aguarde um instante e tente novamente.";

  const buckets = new Map<string, Bucket>();

  // Periodically clean expired buckets to avoid unbounded growth.
  const cleaner = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, windowMs);
  cleaner.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}