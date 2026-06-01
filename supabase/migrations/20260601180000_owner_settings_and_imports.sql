create table if not exists public.owner_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  workspace_name text,
  company_name text,
  company_website text,
  dark_mode boolean not null default false,
  accent_color text not null default '#5B5FEF',
  reduce_motion boolean not null default false,
  compact_layout boolean not null default false,
  email_notifications boolean not null default true,
  import_notifications boolean not null default true,
  security_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_api_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  token_preview text not null,
  token_secret_hash text not null,
  is_revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.cars
  add column if not exists transmission text,
  add column if not exists fuel_type text,
  add column if not exists seats integer,
  add column if not exists description text;

create index if not exists owner_settings_owner_idx on public.owner_settings(owner_id);
create index if not exists owner_api_tokens_owner_idx on public.owner_api_tokens(owner_id, is_revoked, created_at desc);

alter table if exists public.owner_settings enable row level security;
alter table if exists public.owner_api_tokens enable row level security;

drop policy if exists owner_settings_super_owner_all on public.owner_settings;
create policy owner_settings_super_owner_all
on public.owner_settings
for all
to authenticated
using (public.is_super_owner() and owner_id = auth.uid())
with check (public.is_super_owner() and owner_id = auth.uid());

drop policy if exists owner_api_tokens_super_owner_all on public.owner_api_tokens;
create policy owner_api_tokens_super_owner_all
on public.owner_api_tokens
for all
to authenticated
using (public.is_super_owner() and owner_id = auth.uid())
with check (public.is_super_owner() and owner_id = auth.uid());
