import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.middleware';
import { env } from '../config/env';
import { tryGetSupabaseAdmin } from '../config/supabase';

export type AuthClaims = {
  sub: string;
  role: string;
  phone?: string;
  email?: string;
  exp?: number;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

/** Demo token: base64url(JSON claims). Used only when Supabase is not configured. */
export function parseDemoToken(token: string): AuthClaims | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as AuthClaims;
    if (!claims.sub) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export function issueDemoToken(input: {
  userId: string;
  role: string;
  phone?: string;
  ttlSeconds?: number;
}): string {
  const claims: AuthClaims = {
    sub: input.userId,
    role: input.role,
    phone: input.phone,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 60 * 60 * 24 * 7),
  };
  return Buffer.from(JSON.stringify(claims)).toString('base64url');
}

async function resolveBearer(token: string): Promise<AuthClaims | null> {
  const admin = tryGetSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {};
      return {
        sub: data.user.id,
        role: (meta.role as string) || 'homeowner',
        phone: data.user.phone,
        email: data.user.email,
      };
    }
  }

  // Demo tokens only outside strict production, or when Supabase isn't wired
  if (env.NODE_ENV === 'production' && admin) return null;
  return parseDemoToken(token);
}

/** Requires Authorization: Bearer <token> */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new AppError('UNAUTHORIZED', 'Sign in required.', 401));
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    const claims = await resolveBearer(token);
    if (!claims) {
      next(new AppError('UNAUTHORIZED', 'Invalid or expired session. Sign in again.', 401));
      return;
    }
    req.auth = claims;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const claims = await resolveBearer(header.slice('Bearer '.length).trim());
      if (claims) req.auth = claims;
    }
    next();
  } catch {
    next();
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError('UNAUTHORIZED', 'Sign in required.', 401));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new AppError('FORBIDDEN', 'You do not have permission for this action.', 403));
      return;
    }
    next();
  };
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0');
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}
