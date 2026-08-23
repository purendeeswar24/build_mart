import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, issueDemoToken } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { env } from '../config/env';
import { isDatabaseConfigured } from '../config/db';
import { isEmailConfigured, sendOtpEmail } from '../config/mailer';
import { isRazorpayConfigured } from '../config/razorpay';
import {
  consumeOtp,
  issueOtp,
  normalizeEmail,
  normalizePhone,
} from '../services/otp.service';
import {
  loginWithPassword,
  markEmailVerified,
  registerAccount,
} from '../services/credentials.service';
import {
  ensureDefaultAddresses,
  getUserByEmail,
  getUserById,
  getUserByPhone,
  upsertUser,
  type UserRole,
} from '../services/users.service';
import { queryOne } from '../config/db';

export const authRouter = Router();

const publicRoleSchema = z
  .enum(['homeowner', 'contractor', 'civil_engineer', 'vendor'])
  .default('homeowner');

function displayPhone(e164: string) {
  const digits = e164.replace(/\D/g, '').slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function emailUserId(email: string) {
  return `mail-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 16)}`;
}

authRouter.post('/otp/send', authRateLimiter, async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
    }

    const body = z
      .object({
        channel: z.enum(['phone', 'email']),
        phone: z.string().optional(),
        email: z.string().optional(),
      })
      .parse(req.body);

    if (body.channel === 'phone') {
      throw new AppError(
        'SMS_UNAVAILABLE',
        'Phone login is not available. Sign in with your user ID or a verified email.',
        503,
      );
    }

    const destination = normalizeEmail(body.email ?? '');
    if (!isEmailConfigured()) {
      throw new AppError(
        'EMAIL_NOT_CONFIGURED',
        'Email sending is not configured. Add RESEND_API_KEY in .env.',
        503,
      );
    }
    const code = await issueOtp('email', destination);
    await sendOtpEmail(destination, code);
    res.json({
      ok: true,
      channel: 'email',
      destination,
      expiresInSec: 600,
      delivery: 'email',
      hint: `We emailed a 6-digit code to ${destination}. Check inbox and spam.`,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', authRateLimiter, async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
    }

    const body = z
      .object({
        channel: z.enum(['phone', 'email']).default('phone'),
        phone: z.string().optional(),
        email: z.string().optional(),
        otp: z.string().min(4),
        fullName: z.string().optional(),
        role: publicRoleSchema,
      })
      .parse(req.body);

    const role = body.role as UserRole;
    const fullName = body.fullName?.trim() || 'BuildMart User';

    if (body.channel === 'email') {
      const email = normalizeEmail(body.email ?? '');
      await consumeOtp('email', email, body.otp);
      await markEmailVerified(email);
      const existing = await getUserByEmail(email);
      const userId = existing?.id ?? emailUserId(email);
      const saved = await upsertUser({
        id: userId,
        email,
        fullName: existing?.full_name || fullName,
        role: existing?.role || role,
      });
      await ensureDefaultAddresses(userId);
      const token = issueDemoToken({
        userId,
        role: saved.role,
        email: saved.email ?? email,
        phone: saved.phone ?? undefined,
      });
      res.json({
        token,
        user: {
          id: saved.id,
          fullName: saved.full_name,
          phone: saved.phone ? displayPhone(saved.phone) : '',
          email: saved.email ?? email,
          role: saved.role,
        },
        mode: 'live',
      });
      return;
    }

    const phone = normalizePhone(body.phone ?? '');
    await consumeOtp('phone', phone, body.otp);
    const digits = phone.slice(-10);
    const existing = await getUserByPhone(phone);
    const userId = existing?.id ?? `demo-${digits}`;
    const saved = await upsertUser({
      id: userId,
      phone,
      fullName: existing?.full_name || fullName,
      role: existing?.role || role,
    });
    await ensureDefaultAddresses(userId);

    const token = issueDemoToken({
      userId,
      role: saved.role,
      phone,
      email: saved.email ?? undefined,
    });
    res.json({
      token,
      user: {
        id: saved.id,
        fullName: saved.full_name,
        phone: displayPhone(phone),
        email: saved.email ?? undefined,
        role: saved.role,
      },
      mode: 'live',
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
    }
    if (!isEmailConfigured()) {
      throw new AppError('EMAIL_NOT_CONFIGURED', 'Email sending is not configured.', 503);
    }
    const body = z
      .object({
        username: z.string().min(4),
        email: z.string().min(5),
        password: z.string().min(8),
        fullName: z.string().min(2),
        role: publicRoleSchema,
      })
      .parse(req.body);

    const created = await registerAccount({
      username: body.username,
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: body.role as UserRole,
    });
    const code = await issueOtp('email', created.user.email!);
    await sendOtpEmail(created.user.email!, code);
    res.status(201).json({
      ok: true,
      needsVerification: true,
      username: created.username,
      email: created.user.email,
      hint: `We emailed a verification code to ${created.user.email}. Check inbox and spam.`,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
    }
    const body = z
      .object({
        userId: z.string().min(2),
        password: z.string().min(1),
      })
      .parse(req.body);
    const row = await loginWithPassword(body.userId, body.password);
    const token = issueDemoToken({
      userId: row.user_id,
      role: row.role,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
    });
    res.json({
      token,
      user: {
        id: row.user_id,
        username: row.username,
        fullName: row.full_name,
        phone: row.phone ? displayPhone(row.phone) : '',
        email: row.email ?? undefined,
        role: row.role,
        emailVerified: true,
      },
      mode: 'live',
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    if (isDatabaseConfigured() && req.auth?.sub) {
      const data = await getUserById(req.auth.sub);
      if (data) {
        const cred = await queryOne<{ username: string; email_verified: boolean }>(
          'select username, email_verified from user_credentials where user_id = $1',
          [data.id],
        );
        res.json({
          user: {
            id: data.id,
            username: cred?.username,
            fullName: data.full_name,
            phone: data.phone,
            email: data.email,
            role: data.role,
            gstin: data.gstin,
            emailVerified: cred?.email_verified ?? false,
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
  const database = isDatabaseConfigured();
  res.json({
    database,
    supabase: false,
    email: isEmailConfigured(),
    razorpay: isRazorpayConfigured(),
    mode: database ? 'live' : 'demo',
    ...(env.NODE_ENV !== 'production' ? { nodeEnv: env.NODE_ENV } : {}),
  });
});
