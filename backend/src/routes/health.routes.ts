import { Router } from 'express';
import { env } from '../config/env';
import { isSupabaseAdminConfigured } from '../config/supabase';
import { isRazorpayConfigured } from '../config/razorpay';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const supabase = isSupabaseAdminConfigured();
  const razorpay = isRazorpayConfigured();
  res.json({
    status: 'ok',
    env: env.NODE_ENV,
    ready: {
      supabase,
      razorpay,
      production: supabase && razorpay && env.NODE_ENV === 'production',
    },
  });
});
