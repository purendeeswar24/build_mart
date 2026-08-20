import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, issueDemoToken } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { env } from '../config/env';
import { isSupabaseAdminConfigured, tryGetSupabaseAdmin } from '../config/supabase';

export const authRouter = Router();

const otpSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().min(4),
  fullName: z.string().optional(),
  role: z
    .enum(['homeowner', 'contractor', 'civil_engineer', 'vendor', 'admin'])
    .default('homeowner'),
});

const DEMO_OTP = '123456';

/**
 * OTP verify:
 * - With Supabase: clients should use supabase.auth.verifyOtp directly; this endpoint
 *   remains for demo / email-less environments.
 * - Without Supabase: demo OTP 123456 → local session token.
 */
authRouter.post('/otp/verify', async (req, res, next) => {
  try {
    if (env.NODE_ENV === 'production') {
      throw new AppError(
        'USE_SUPABASE_AUTH',
        'Use Supabase phone OTP from the client in production.',
        400,
      );
    }

    const body = otpSchema.parse(req.body);
    if (body.otp !== DEMO_OTP) {
      throw new AppError('INVALID_OTP', 'Invalid OTP. Use 123456 in demo mode.', 401);
    }
    const digits = body.phone.replace(/\D/g, '').slice(-10);
    const userId = `demo-${digits}`;
    const token = issueDemoToken({
      userId,
      role: body.role,
      phone: `+91${digits}`,
    });
    res.json({
      token,
      user: {
        id: userId,
        fullName: body.fullName?.trim() || 'BuildMart User',
        phone: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
        role: body.role,
      },
      mode: 'demo',
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const admin = tryGetSupabaseAdmin();
    if (admin && req.auth?.sub && !req.auth.sub.startsWith('demo-')) {
      const { data } = await admin
        .from('profiles')
        .select('id, full_name, phone, email, role, gstin')
        .eq('id', req.auth.sub)
        .maybeSingle();
      if (data) {
        res.json({
          user: {
            id: data.id,
            fullName: data.full_name,
            phone: data.phone,
            email: data.email,
            role: data.role,
            gstin: data.gstin,
          },
        });
        return;
      }
    }
    res.json({
      user: {
        id: req.auth!.sub,
        role: req.auth!.role,
        phone: req.auth!.phone,
        email: req.auth!.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/status', (_req, res) => {
  res.json({
    supabase: isSupabaseAdminConfigured(),
    mode: isSupabaseAdminConfigured() ? 'production' : 'demo',
    nodeEnv: env.NODE_ENV,
  });
});
