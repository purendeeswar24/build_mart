import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { uploadsDir } from './config/uploads';
import { errorHandler } from './middleware/errorHandler.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';
import { securityHeaders } from './middleware/auth.middleware';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { ordersRouter } from './routes/orders.routes';
import { paymentsRouter } from './routes/payments.routes';
import { catalogRouter } from './routes/catalog.routes';
import { adminRouter } from './routes/admin.routes';
import { uploadsRouter } from './routes/uploads.routes';
import { wishlistRouter } from './routes/wishlist.routes';
import { addressesRouter } from './routes/addresses.routes';
import { geoRouter } from './routes/geo.routes';
import { biddingRouter } from './routes/bidding.routes';
import { authMiddleware, optionalAuth, requireRole } from './middleware/auth.middleware';

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

  app.use('/uploads', express.static(uploadsDir));

  app.use(healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/geo', geoRouter);
  app.use('/api/v1/admin/uploads', authMiddleware, requireRole('admin'), uploadsRouter);
  app.use('/api/v1/admin', authMiddleware, requireRole('admin'), adminRouter);
  app.use('/api/v1/wishlist', authMiddleware, wishlistRouter);
  app.use('/api/v1/addresses', authMiddleware, addressesRouter);
  app.use('/api/v1/orders', authMiddleware, ordersRouter);
  app.use('/api/v1/payments', authMiddleware, paymentsRouter);
  app.use('/api/v1/hire', optionalAuth, biddingRouter);

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
