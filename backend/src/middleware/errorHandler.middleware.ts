import { NextFunction, Request, Response } from 'express';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Zod validation
  if (err && typeof err === 'object' && 'issues' in err) {
    const body: ApiErrorBody = {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request body.' },
    };
    res.status(400).json(body);
    return;
  }

  console.error(err);
  const body: ApiErrorBody = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(body);
}
