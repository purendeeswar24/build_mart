-- Phase 6: orders, order_items, atomic stock decrement

create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users (id),
  address_id text not null,
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
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  variant_id text not null,
  quantity int not null check (quantity > 0),
  price_at_purchase numeric not null
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists orders_user_id_idx on public.orders (user_id);

-- Atomic stock decrement: returns false if any line would oversell
create or replace function public.decrement_stock(
  p_items jsonb
) returns boolean
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
    select stock_qty into available from public.product_variants where id = v_id for update;
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
