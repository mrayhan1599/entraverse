create extension if not exists "uuid-ossp";

create table if not exists public.purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null unique,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'cancelled', 'removed')),
  vendor_name text,
  due_date date,
  currency text,
  total_amount numeric,
  raw_payload jsonb,
  last_synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists purchase_orders_status_idx on public.purchase_orders (status);
create index if not exists purchase_orders_last_synced_at_idx on public.purchase_orders (last_synced_at desc);

create table if not exists public.purchase_order_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  sku text not null,
  quantity numeric not null default 0,
  unit_price numeric,
  description text,
  raw_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint purchase_order_items_unique unique (purchase_order_id, sku)
);

create index if not exists purchase_order_items_sku_idx on public.purchase_order_items (lower(sku));

create table if not exists public.in_transit_stock (
  sku text primary key,
  total_quantity numeric not null default 0,
  last_calculated_at timestamptz not null default timezone('utc', now())
);

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.in_transit_stock enable row level security;

create policy if not exists "Allow read purchase orders"
  on public.purchase_orders
  for select
  to anon, authenticated
  using (true);

create policy if not exists "Allow read purchase order items"
  on public.purchase_order_items
  for select
  to anon, authenticated
  using (true);

create policy if not exists "Allow read in transit stock"
  on public.in_transit_stock
  for select
  to anon, authenticated
  using (true);

create or replace function public.set_purchase_orders_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
  before update on public.purchase_orders
  for each row
  execute function public.set_purchase_orders_updated_at();

create or replace function public.set_purchase_order_items_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_purchase_order_items_updated_at on public.purchase_order_items;
create trigger set_purchase_order_items_updated_at
  before update on public.purchase_order_items
  for each row
  execute function public.set_purchase_order_items_updated_at();

