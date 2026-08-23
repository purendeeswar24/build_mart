import { env } from './env';
import { apiClient } from '../services/apiClient';

/** True when public Supabase keys look real (not placeholders). */
export function isSupabaseLive(): boolean {
  return (
    !!env.supabaseUrl &&
    !!env.supabaseAnonKey &&
    !env.supabaseUrl.includes('your-project') &&
    env.supabaseAnonKey !== 'your-anon-key'
  );
}

/** True when frontend points at a real API host (not empty). */
export function isApiConfigured(): boolean {
  return !!env.apiBaseUrl && env.apiBaseUrl.length > 0;
}

export function isRazorpayPublicConfigured(): boolean {
  const key = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  return !!key && !key.includes('xxxxx') && key !== 'rzp_test_demo';
}

export async function isDatabaseLive(): Promise<boolean> {
  try {
    const health = await apiClient.get<{ ready?: { database?: boolean } }>('/health', {
      auth: false,
    });
    return !!health.ready?.database;
  } catch {
    return false;
  }
}

/** Prefer live backend when the API reports a connected Postgres/Neon database. */
export async function getBackendMode(): Promise<'production' | 'demo'> {
  try {
    const status = await apiClient.get<{ mode: string }>('/api/v1/auth/status', {
      auth: false,
    });
    return status.mode === 'live' || status.mode === 'production' ? 'production' : 'demo';
  } catch {
    return isSupabaseLive() ? 'production' : 'demo';
  }
}
