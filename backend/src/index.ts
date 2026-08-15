import { createApp } from './app';
import { env } from './config/env';
import { isSupabaseAdminConfigured } from './config/supabase';
import { isRazorpayConfigured } from './config/razorpay';

const app = createApp();

app.listen(env.PORT, () => {
  const supabase = isSupabaseAdminConfigured();
  const razorpay = isRazorpayConfigured();
  const mode = supabase ? 'production-capable' : 'demo';
  console.log(`BuildMart API listening on http://localhost:${env.PORT}`);
  console.log(`  env=${env.NODE_ENV}  mode=${mode}`);
  console.log(`  supabase=${supabase ? 'configured' : 'missing'}  razorpay=${razorpay ? 'configured' : 'missing'}`);
  if (env.NODE_ENV === 'production' && (!supabase || !razorpay)) {
    console.warn(
      '  WARNING: NODE_ENV=production but Supabase and/or Razorpay secrets are missing. See docs/PRODUCTION.md',
    );
  }
});
