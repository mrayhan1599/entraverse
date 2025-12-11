-- Jalankan skrip ini di SQL Editor Supabase.
-- Skrip ini membuat tabel untuk kebutuhan pengadaan dan periode penjualan (WIB).

create extension if not exists "uuid-ossp";

create table if not exists procurement_needs (
  id bigint generated always as identity primary key,
  item_name text not null,
  sku text,
  vendor text,
  quantity numeric not null,
  unit text default 'pcs',
  target_date date,
  priority text default 'sedang',
  notes text,
  status text default 'menunggu',
  created_at timestamptz default now()
);

create index if not exists idx_procurement_needs_target_date on procurement_needs(target_date);

create table if not exists sales_periods (
  id bigint generated always as identity primary key,
  period_name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text default 'Asia/Jakarta',
  updated_at timestamptz default now(),
  unique(period_name)
);

-- Contoh seed awal
insert into procurement_needs (item_name, sku, vendor, quantity, unit, target_date, priority, status)
values
  ('Thermal Printer', 'SKU-PRN-001', 'PT Cetak Cepat', 20, 'pcs', current_date + interval '3 day', 'tinggi', 'menunggu'),
  ('Kardus 40x40', 'SKU-KDS-040', 'LogiPack', 120, 'pcs', null, 'sedang', 'direncanakan')
on conflict do nothing;

insert into sales_periods (period_name, start_at, end_at, timezone)
values
  ('Periode A', (now() at time zone 'Asia/Jakarta'), (now() at time zone 'Asia/Jakarta') + interval '7 day', 'Asia/Jakarta'),
  ('Periode B', (now() at time zone 'Asia/Jakarta') + interval '8 day', (now() at time zone 'Asia/Jakarta') + interval '15 day', 'Asia/Jakarta')
on conflict (period_name) do update set start_at = excluded.start_at, end_at = excluded.end_at, timezone = excluded.timezone, updated_at = now();
