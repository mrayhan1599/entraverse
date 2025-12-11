-- Jalankan skrip ini di SQL Editor Supabase.
-- Skrip ini membuat katalog produk yang perlu diawasi lead time-nya
-- dan menyiapkan trigger pembaruan untuk kolom updated_at.

create extension if not exists "uuid-ossp";

create table if not exists public.procurement_catalog (
  id uuid primary key default uuid_generate_v4(),
  product_name text not null,
  sku text not null unique,
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  default_vendor text,
  default_quantity numeric not null default 0,
  unit text not null default 'pcs',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists procurement_catalog_active_idx on public.procurement_catalog (is_active);
create index if not exists procurement_catalog_lead_time_idx on public.procurement_catalog (lead_time_days);

create or replace function public.set_procurement_catalog_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_procurement_catalog_updated_at on public.procurement_catalog;
create trigger set_procurement_catalog_updated_at
  before update on public.procurement_catalog
  for each row
  execute function public.set_procurement_catalog_updated_at();

-- Contoh seed awal supaya fungsi otomatis bisa langsung dipakai
insert into public.procurement_catalog (product_name, sku, lead_time_days, default_vendor, default_quantity, unit, notes)
values
  ('VR Headset', 'SKU-VR-001', 5, 'Vendor A', 25, 'pcs', 'Lead time 5 hari untuk periode B mulai 16'),
  ('Kardus 40x40', 'SKU-KDS-040', 3, 'LogiPack', 120, 'pcs', 'Lead time 3 hari untuk restock harian')
on conflict (sku) do update set
  product_name = excluded.product_name,
  lead_time_days = excluded.lead_time_days,
  default_vendor = excluded.default_vendor,
  default_quantity = excluded.default_quantity,
  unit = excluded.unit,
  notes = excluded.notes,
  is_active = true,
  updated_at = timezone('utc', now());
