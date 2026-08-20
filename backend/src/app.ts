import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';
import { securityHeaders } from './middleware/auth.middleware';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { ordersRouter } from './routes/orders.routes';
import { paymentsRouter, paymentsWebhookHandler } from './routes/payments.routes';
import { authMiddleware } from './middleware/auth.middleware';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(
    cors({
      origin: (() => {
        if (env.NODE_ENV !== 'production') return true;
        const fromEnv = env.CORS_ORIGINS?.split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (fromEnv?.length) return fromEnv;
        return [/buildmart\./i, /localhost:\d+$/];
      })(),
      credentials: true,
    }),
  );

  // Raw body required for Razorpay HMAC — must run before express.json()
  app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), paymentsWebhookHandler);

  app.use(express.json({ limit: '100kb' }));
  app.use(rateLimiter);

  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  app.use(healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/orders', authMiddleware, ordersRouter);
  app.use('/api/v1/payments', authMiddleware, paymentsRouter);

  app.use('/api/v1', (_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Unknown API route.',
      },
    });
  });

  app.use(errorHandler);

  return app;
}
