import fs from 'fs';
import path from 'path';
import { getMigratePool, isDatabaseConfigured } from '../config/db';

export async function migrate(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not set');
  }
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const pool = getMigratePool();
  await pool.query(sql);
  await pool.query(`
    alter table public.products
      add column if not exists listing_status text not null default 'on_sale';
    alter table public.products
      add column if not exists is_active boolean not null default true;
    alter table public.orders
      add column if not exists latitude numeric;
    alter table public.orders
      add column if not exists longitude numeric;
    create table if not exists public.hire_jobs (
      id text primary key,
      owner_id text not null references public.users (id) on delete cascade,
      category text not null,
      title text not null,
      description text not null,
      city text,
      pincode text,
      bidding_ends_at timestamptz not null,
      owner_estimate numeric(12,2),
      commission_percent numeric(5,2) not null default 8,
      status text not null default 'open',
      awarded_bid_id text,
      commission_amount numeric(12,2),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists public.hire_bids (
      id text primary key,
      job_id text not null references public.hire_jobs (id) on delete cascade,
      bidder_id text not null references public.users (id) on delete cascade,
      amount numeric(12,2) not null,
      message text,
      days_to_complete int,
      status text not null default 'submitted',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (job_id, bidder_id)
    );
    create table if not exists public.hire_messages (
      id text primary key,
      job_id text not null references public.hire_jobs (id) on delete cascade,
      sender_id text references public.users (id) on delete set null,
      sender_role text not null,
      body text not null,
      created_at timestamptz not null default now()
    );
    create index if not exists idx_hire_messages_job on public.hire_messages (job_id, created_at);
  `);
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('BuildMart schema applied');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migrate failed:', err);
      process.exit(1);
    });
}
