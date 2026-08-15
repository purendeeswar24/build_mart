import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const hasRealSupabase =
  !!env.supabaseUrl &&
  !!env.supabaseAnonKey &&
  !env.supabaseUrl.includes('your-project') &&
  env.supabaseAnonKey !== 'your-anon-key';

export const isSupabaseConfigured = hasRealSupabase;

export const supabase: SupabaseClient | null = hasRealSupabase
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
