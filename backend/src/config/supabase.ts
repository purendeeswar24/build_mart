import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | null = null;

export function isSupabaseAdminConfigured(): boolean {
  return (
    !!env.SUPABASE_URL &&
    !!env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_URL.includes('your-project') &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-key'
  );
}

/**
 * Server-side Supabase client (service role). Returns null if not configured.
 * Never import this from the frontend — service role bypasses RLS.
 */
export function tryGetSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) return null;
  if (client) return client;
  client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export function getSupabaseAdmin(): SupabaseClient {
  const c = tryGetSupabaseAdmin();
  if (!c) {
    throw new Error(
      'Supabase admin not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
    );
  }
  return c;
}
