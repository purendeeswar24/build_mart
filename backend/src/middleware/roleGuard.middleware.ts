import { NextFunction, Request, Response } from 'express';
import { requireRole } from './auth.middleware';

/** Role-gates admin/vendor routes. */
export function roleGuard(...roles: string[]) {
  return requireRole(...roles);
}

// re-export for callers that import NextFunction types
export type { NextFunction, Request, Response };
