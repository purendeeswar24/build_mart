-- Phase 7: wishlist + profile extras

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  variant_id text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);

alter table public.orders
  add column if not exists cancel_reason text;

-- Optional profile fields (if using public.profiles)
-- alter table public.profiles add column if not exists gstin text;
