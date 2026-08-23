import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.middleware';

type Bucket = { count: number; resetAt: number };

function createLimiter(max: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      next(new AppError('RATE_LIMITED', 'Too many requests. Try again in a minute.', 429));
      return;
    }
    next();
  };
}

/** In-memory IP rate limiter — swap for Redis in multi-instance production. */
export const rateLimiter = createLimiter(120, 60_000);
export const authRateLimiter = createLimiter(20, 60_000);
