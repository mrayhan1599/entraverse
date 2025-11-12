create extension if not exists "uuid-ossp";

create table if not exists public.api_integrations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  logo_path text,
  category text,
  status text not null default 'available' check (status in ('available', 'pending', 'connected')),
  connected_account text,
  sync_frequency text,
  capabilities text,
  api_base_url text,
  authorization_path text,
  access_token text,
  last_sync timestamptz,
  requires_setup boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists api_integrations_status_idx on public.api_integrations (status);
create index if not exists api_integrations_name_idx on public.api_integrations (lower(name));

alter table public.api_integrations enable row level security;

drop policy if exists "Allow read integrations" on public.api_integrations;
create policy "Allow read integrations"
  on public.api_integrations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow insert integrations" on public.api_integrations;
create policy "Allow insert integrations"
  on public.api_integrations
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow update integrations" on public.api_integrations;
create policy "Allow update integrations"
  on public.api_integrations
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow delete integrations" on public.api_integrations;
create policy "Allow delete integrations"
  on public.api_integrations
  for delete
  to anon, authenticated
  using (true);

create or replace function public.set_api_integrations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_api_integrations_updated_at on public.api_integrations;
create trigger set_api_integrations_updated_at
  before update on public.api_integrations
  for each row
  execute function public.set_api_integrations_updated_at();
