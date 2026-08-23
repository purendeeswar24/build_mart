import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  /** Pooled Neon URL for the API. Frontend never sees this. */
  DATABASE_URL: z.string().optional(),
  /** Direct (non-pooler) Neon URL — used for schema migrations. */
  DATABASE_URL_UNPOOLED: z.string().optional(),
  /** Comma-separated allowed origins in production (e.g. https://app.buildmart.in,https://admin.buildmart.in) */
  CORS_ORIGINS: z.string().optional(),
  /** Resend API key — free tier is enough for email OTPs. */
  RESEND_API_KEY: z.string().optional(),
  /** Verified sender. Resend test sender works without a custom domain. */
  RESEND_FROM_EMAIL: z.string().default('BuildMart <beth.t@example.com>'),
  /** Extra secret mixed into OTP hashes. */
  OTP_PEPPER: z.string().optional(),
  /** HMAC secret for session tokens. Required in production. */
  AUTH_SECRET: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  /** Set to false to disable local test users even in development. */
  ALLOW_TEST_ACCOUNTS: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === '1' || v === 'true')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;

/** Call before wiring payment/auth routes that require secrets. */
export function assertRequiredSecrets(keys: (keyof typeof env)[]): void {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in values before starting these features.',
    );
  }
}
