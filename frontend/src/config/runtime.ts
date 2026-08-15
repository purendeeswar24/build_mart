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

/** Prefer live backend when Supabase OR a non-local API is configured. */
export async function getBackendMode(): Promise<'production' | 'demo'> {
  try {
    const status = await apiClient.get<{ mode: string }>('/api/v1/auth/status', {
      auth: false,
    });
    return status.mode === 'production' ? 'production' : 'demo';
  } catch {
    return isSupabaseLive() ? 'production' : 'demo';
  }
}
