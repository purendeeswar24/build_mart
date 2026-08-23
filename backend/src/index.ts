import { createApp } from './app';
import { env } from './config/env';
import { isDatabaseConfigured } from './config/db';
import { isRazorpayConfigured } from './config/razorpay';
import { isEmailConfigured } from './config/mailer';
import { migrate } from './db/migrate';
import { seedIfEmpty } from './db/seed';
import { syncTestAccounts } from './services/credentials.service';

async function main() {
  if (isDatabaseConfigured()) {
    try {
      await migrate();
      const seed = await seedIfEmpty();
      await syncTestAccounts();
      console.log(`  database schema ready; seed ${seed.seeded ? 'applied' : 'skipped'} (${seed.reason})`);
    } catch (err) {
      console.error('  database bootstrap failed:', err);
      if (env.NODE_ENV === 'production') throw err;
    }
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    const database = isDatabaseConfigured();
    const razorpay = isRazorpayConfigured();
    const email = isEmailConfigured();
    const mode = database ? 'postgres' : 'demo';
    console.log(`BuildMart API listening on http://localhost:${env.PORT}`);
    console.log(`  env=${env.NODE_ENV}  mode=${mode}`);
    console.log(
      `  database=${database ? 'configured' : 'missing'}  razorpay=${razorpay ? 'configured' : 'missing'}  email=${email ? 'configured' : 'missing'}`,
    );
    if (env.NODE_ENV === 'production' && !database) {
      console.warn('  WARNING: NODE_ENV=production but DATABASE_URL is missing. See .env.example');
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
