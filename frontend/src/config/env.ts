import Constants from 'expo-constants';

type PublicEnv = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleMapsApiKey?: string;
  apiBaseUrl: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

/** Typed public env — only EXPO_PUBLIC_* / non-secret values belong here. */
export const env: PublicEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey,
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? extra.googleMapsApiKey,
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    extra.apiBaseUrl ??
    'http://localhost:4000',
};
