import { Router } from 'express';
import { env } from '../config/env';
import { isDatabaseConfigured, pingDatabase } from '../config/db';
import { isRazorpayConfigured } from '../config/razorpay';
import { isEmailConfigured } from '../config/mailer';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const databaseConfigured = isDatabaseConfigured();
  const database = databaseConfigured ? await pingDatabase() : false;
  res.json({
    status: 'ok',
    ready: {
      database,
      razorpay: isRazorpayConfigured(),
      email: isEmailConfigured(),
    },
    ...(env.NODE_ENV !== 'production' ? { env: env.NODE_ENV } : {}),
  });
});
