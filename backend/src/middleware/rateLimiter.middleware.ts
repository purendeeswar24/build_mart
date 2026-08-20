import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.middleware';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_REQ = 120;

/** In-memory IP rate limiter — swap for Redis in multi-instance production. */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (buckets.size > 4000) {
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k);
    }
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const isOtp = req.path.endsWith('/otp/verify');
  const max = isOtp ? 10 : MAX_REQ;
  const key = `${ip}:${isOtp ? 'otp' : 'api'}`;

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    res.setHeader('Retry-After', '60');
    next(new AppError('RATE_LIMITED', 'Too many requests. Try again in a minute.', 429));
    return;
  }
  next();
}
