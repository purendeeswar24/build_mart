-- BuildMart PostgreSQL schema (Neon-compatible)
-- Run via backend migrate. Frontend never connects to this database.

create extension if not exists "pgcrypto";

-- ─── Users / profiles ───────────────────────────────────────
create table if not exists public.users (
  id text primary key,
  phone text unique,
  email text unique,
  full_name text not null default 'BuildMart User',
  role text not null default 'homeowner'
    check (role in ('homeowner', 'contractor', 'civil_engineer', 'vendor', 'admin')),
  gstin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_credentials (
  user_id text primary key references public.users (id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  email_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_credentials_username_idx on public.user_credentials (lower(username));

create table if not exists public.profiles (
  id text primary key references public.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  role text not null default 'homeowner'
    check (role in ('homeowner', 'contractor', 'civil_engineer', 'vendor', 'admin')),
  gstin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Catalog ────────────────────────────────────────────────
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  parent_id text references public.categories(id) on delete set null,
  icon_url text,
  short_name text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  brand text not null,
  title text not null,
  slug text not null unique,
  description text,
  material text,
  warranty_years int,
  features text[] not null default '{}',
  badge text,
  trending boolean not null default false,
  bestseller boolean not null default false,
  featured boolean not null default false,
  listing_status text not null default 'on_sale'
    check (listing_status in ('on_sale', 'limited', 'out_of_stock', 'hidden')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  variant_label text not null,
  attributes jsonb not null default '{}'::jsonb,
  mrp numeric(12,2) not null,
  selling_price numeric(12,2) not null,
  stock_qty int not null default 0,
  sku text not null unique,
  image_urls text[] not null default '{}',
  image_tint text,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_variants_product on public.product_variants(product_id);

-- ─── Delivery ───────────────────────────────────────────────
create table if not exists public.serviceable_pincodes (
  pincode text primary key,
  city text not null,
  is_active boolean not null default true,
  eta_minutes int not null default 30,
  cod_eligible boolean not null default true
);

create table if not exists public.addresses (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  label text not null,
  full_address text not null,
  pincode text not null,
  city text not null,
  latitude numeric,
  longitude numeric,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_addresses_user on public.addresses(user_id);

-- ─── Orders ─────────────────────────────────────────────────
create table if not exists public.orders (
  id text primary key,
  user_id text not null references public.users (id),
  address_id text not null,
  address_label text,
  pincode text,
  city text,
  status text not null check (status in (
    'pending_payment', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'
  )),
  payment_status text not null check (payment_status in (
    'pending', 'paid', 'failed', 'refunded'
  )),
  payment_method text not null check (payment_method in ('upi', 'card', 'cod')),
  subtotal numeric not null,
  delivery_fee numeric not null,
  total numeric not null,
  eta_minutes int default 30,
  razorpay_order_id text,
  razorpay_payment_id text,
  latitude numeric,
  longitude numeric,
  cancel_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  product_id text,
  variant_id text not null,
  variant_label text,
  title text,
  quantity int not null check (quantity > 0),
  price_at_purchase numeric not null
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

-- ─── Wishlist ───────────────────────────────────────────────
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  product_id text not null,
  variant_id text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);

-- ─── Login OTPs (hashed, short-lived) ───────────────────────
create table if not exists public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('phone', 'email')),
  destination text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_otps_dest_idx
  on public.auth_otps (channel, destination, created_at desc);

-- ─── Stock functions ────────────────────────────────────────
create or replace function public.decrement_stock(p_items jsonb)
returns boolean
language plpgsql
as $$
declare
  item jsonb;
  v_id text;
  qty int;
  available int;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_id := item->>'variant_id';
    qty := (item->>'quantity')::int;
    select stock_qty into available
      from public.product_variants
      where id = v_id
      for update;
    if available is null or available < qty then
      return false;
    end if;
  end loop;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_id := item->>'variant_id';
    qty := (item->>'quantity')::int;
    update public.product_variants
      set stock_qty = stock_qty - qty
      where id = v_id;
  end loop;

  return true;
end;
$$;

-- ─── Hire / bidding ─────────────────────────────────────────
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
  status text not null default 'open'
    check (status in ('open', 'closed', 'awarded', 'cancelled')),
  awarded_bid_id text,
  commission_amount numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hire_jobs_status_ends on public.hire_jobs (status, bidding_ends_at);
create index if not exists idx_hire_jobs_owner on public.hire_jobs (owner_id);

create table if not exists public.hire_bids (
  id text primary key,
  job_id text not null references public.hire_jobs (id) on delete cascade,
  bidder_id text not null references public.users (id) on delete cascade,
  amount numeric(12,2) not null,
  message text,
  days_to_complete int,
  status text not null default 'submitted'
    check (status in ('submitted', 'shortlisted', 'awarded', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, bidder_id)
);

create index if not exists idx_hire_bids_job on public.hire_bids (job_id);

create table if not exists public.hire_messages (
  id text primary key,
  job_id text not null references public.hire_jobs (id) on delete cascade,
  sender_id text references public.users (id) on delete set null,
  sender_role text not null
    check (sender_role in ('owner', 'bidder', 'admin', 'system')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hire_messages_job on public.hire_messages (job_id, created_at);

create or replace function public.increment_stock(p_items jsonb)
returns void
language plpgsql
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update public.product_variants
      set stock_qty = stock_qty + (item->>'quantity')::int
      where id = item->>'variant_id';
  end loop;
end;
$$;
