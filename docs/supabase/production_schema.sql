-- BuildMart production schema (run once in Supabase SQL editor)
-- Applies catalog + orders + wishlist + profiles + RLS

create extension if not exists "pgcrypto";

-- ─── Profiles ───────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  role text not null default 'homeowner'
    check (role in ('homeowner', 'contractor', 'civil_engineer', 'vendor', 'admin')),
  gstin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'BuildMart User'),
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'homeowner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Catalog (idempotent with phase3) ───────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  icon_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  brand text not null,
  title text not null,
  slug text not null unique,
  description text,
  material text,
  warranty_years int,
  features text[] default '{}',
  badge text,
  trending boolean default false,
  bestseller boolean default false,
  featured boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_label text not null,
  attributes jsonb not null default '{}'::jsonb,
  mrp numeric(12,2) not null,
  selling_price numeric(12,2) not null,
  stock_qty int not null default 0,
  sku text not null unique,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_variants_product on public.product_variants(product_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (true);
drop policy if exists "Public read products" on public.products;
create policy "Public read products" on public.products for select using (true);
drop policy if exists "Public read variants" on public.product_variants;
create policy "Public read variants" on public.product_variants for select using (true);

-- ─── Orders ────────────────────────────────────────────────
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users (id),
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

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- Writes go through service role (backend) — no client insert policies

-- ─── Wishlist ──────────────────────────────────────────────
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  variant_id text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);

alter table public.wishlist_items enable row level security;

drop policy if exists "Users manage own wishlist" on public.wishlist_items;
create policy "Users manage own wishlist" on public.wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Stock RPC ─────────────────────────────────────────────
create or replace function public.decrement_stock(p_items jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
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
    select stock_qty into available from public.product_variants where id::text = v_id for update;
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
      where id::text = v_id;
  end loop;

  return true;
end;
$$;

create or replace function public.increment_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update public.product_variants
      set stock_qty = stock_qty + (item->>'quantity')::int
      where id::text = item->>'variant_id';
  end loop;
end;
$$;
