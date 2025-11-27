create extension if not exists "uuid-ossp";

create table if not exists public.warehouse_movements (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('auto', 'manual')),
  period_signature text not null,
  period_start date,
  period_end date,
  header jsonb,
  totals jsonb,
  rows jsonb not null,
  warehouses integer not null default 0,
  file_name text,
  last_loaded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint warehouse_movements_source_signature_unique unique (source, period_signature)
);

create index if not exists warehouse_movements_signature_idx on public.warehouse_movements (period_signature);
create index if not exists warehouse_movements_updated_at_idx on public.warehouse_movements (updated_at desc);

alter table public.warehouse_movements enable row level security;

drop policy if exists "Allow read warehouse movements" on public.warehouse_movements;
create policy "Allow read warehouse movements"
  on public.warehouse_movements
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow insert warehouse movements" on public.warehouse_movements;
create policy "Allow insert warehouse movements"
  on public.warehouse_movements
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow update warehouse movements" on public.warehouse_movements;
create policy "Allow update warehouse movements"
  on public.warehouse_movements
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow delete warehouse movements" on public.warehouse_movements;
create policy "Allow delete warehouse movements"
  on public.warehouse_movements
  for delete
  to anon, authenticated
  using (true);

create or replace function public.set_warehouse_movements_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_warehouse_movements_updated_at on public.warehouse_movements;
create trigger set_warehouse_movements_updated_at
  before update on public.warehouse_movements
  for each row
  execute function public.set_warehouse_movements_updated_at();
