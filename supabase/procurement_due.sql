create extension if not exists "uuid-ossp";

create table if not exists public.procurement_due (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null,
  variant_id text not null,
  sku text,
  product_name text,
  variant_label text,
  next_procurement_date date not null,
  next_procurement_period text,
  next_procurement_signature text not null,
  required_stock numeric,
  unit_price numeric,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint procurement_due_product_variant_unique unique (product_id, variant_id, next_procurement_signature)
);

alter table public.procurement_due
  add column if not exists required_stock numeric,
  add column if not exists unit_price numeric,
  add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists procurement_due_date_idx on public.procurement_due (next_procurement_date);
create index if not exists procurement_due_signature_idx on public.procurement_due (next_procurement_signature);

grant select on public.procurement_due to anon, authenticated;

alter table public.procurement_due enable row level security;

drop policy if exists "Allow read procurement due" on public.procurement_due;
create policy "Allow read procurement due"
  on public.procurement_due
  for select
  to anon, authenticated
  using (true);

create or replace function public.set_procurement_due_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_procurement_due_updated_at on public.procurement_due;
create trigger set_procurement_due_updated_at
  before update on public.procurement_due
  for each row
  execute function public.set_procurement_due_updated_at();

drop view if exists public.procurement_due_today;

create or replace view public.procurement_due_today
with (security_invoker = true)
as
select *
from public.procurement_due
where next_procurement_date = timezone('Asia/Jakarta', now())::date;

grant select on public.procurement_due_today to anon, authenticated;
