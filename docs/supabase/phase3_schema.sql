-- BuildMart Phase 3 schema (run in Supabase SQL editor)
-- Categories → Products → Product variants

create extension if not exists "pgcrypto";

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

create policy "Public read categories" on public.categories for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read variants" on public.product_variants for select using (true);
