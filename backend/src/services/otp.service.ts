import crypto from 'crypto';
import { env } from '../config/env';
import { query, queryOne } from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { assertIndianMobile, assertRealEmail } from '../utils/identity';

export type OtpChannel = 'phone' | 'email';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

function pepper() {
  return env.OTP_PEPPER || env.RAZORPAY_KEY_SECRET || 'buildmart-dev-otp';
}

function hashCode(destination: string, code: string) {
  return crypto.createHash('sha256').update(`${destination}:${code}:${pepper()}`).digest('hex');
}

function randomCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function normalizePhone(raw: string) {
  return assertIndianMobile(raw);
}

export function normalizeEmail(raw: string) {
  return assertRealEmail(raw);
}

export async function issueOtp(channel: OtpChannel, destination: string): Promise<string> {
  const recent = await queryOne<{ created_at: string }>(
    `select created_at from auth_otps
     where channel = $1 and destination = $2
     order by created_at desc
     limit 1`,
    [channel, destination],
  );
  if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError('OTP_COOLDOWN', 'Wait a moment before requesting another code.', 429);
  }

  await query(
    `update auth_otps
     set consumed_at = now()
     where channel = $1 and destination = $2 and consumed_at is null`,
    [channel, destination],
  );

  const code = randomCode();
  await query(
    `insert into auth_otps (channel, destination, code_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [channel, destination, hashCode(destination, code), new Date(Date.now() + OTP_TTL_MS).toISOString()],
  );
  return code;
}

export async function consumeOtp(channel: OtpChannel, destination: string, code: string): Promise<void> {
  const trimmed = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(trimmed)) {
    throw new AppError('INVALID_OTP', 'Enter the 6-digit code.', 401);
  }

  const row = await queryOne<{
    id: string;
    code_hash: string;
    expires_at: string;
    attempts: number;
  }>(
    `select id, code_hash, expires_at, attempts
     from auth_otps
     where channel = $1 and destination = $2 and consumed_at is null
     order by created_at desc
     limit 1`,
    [channel, destination],
  );

  if (!row) {
    throw new AppError('INVALID_OTP', 'Request a new code first.', 401);
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new AppError('OTP_EXPIRED', 'That code expired. Request a new one.', 401);
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new AppError('OTP_LOCKED', 'Too many tries. Request a new code.', 401);
  }

  let ok = false;
  try {
    ok = crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hashCode(destination, trimmed)));
  } catch {
    ok = false;
  }
  if (!ok) {
    await query('update auth_otps set attempts = attempts + 1 where id = $1', [row.id]);
    throw new AppError('INVALID_OTP', 'Wrong code. Try again.', 401);
  }

  await query('update auth_otps set consumed_at = now() where id = $1', [row.id]);
}
