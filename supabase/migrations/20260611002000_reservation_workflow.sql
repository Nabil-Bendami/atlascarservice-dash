begin;

alter table public.reservations
  add column if not exists client_name text,
  add column if not exists client_phone text,
  add column if not exists client_email text,
  add column if not exists city text,
  add column if not exists message text,
  add column if not exists total_days integer,
  add column if not exists total_price numeric,
  add column if not exists verified_at timestamptz,
  add column if not exists rejected_at timestamptz;

alter table public.reservations
  alter column status set default 'pending';

create table if not exists public.owner_whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null,
  owner_phone text not null,
  message text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.reservations enable row level security;
alter table public.owner_whatsapp_notifications enable row level security;

drop policy if exists reservations_super_owner_all on public.reservations;
drop policy if exists reservations_client_manage_own on public.reservations;
drop policy if exists reservations_agency_manage_own on public.reservations;
drop policy if exists reservations_public_insert_pending on public.reservations;
drop policy if exists reservations_owner_all on public.reservations;
drop policy if exists reservations_agency_select_verified on public.reservations;
drop policy if exists "debug authenticated read reservations" on public.reservations;
drop policy if exists "debug authenticated update reservations" on public.reservations;
drop policy if exists owner_whatsapp_notifications_public_insert on public.owner_whatsapp_notifications;
drop policy if exists owner_whatsapp_notifications_owner_all on public.owner_whatsapp_notifications;

create policy reservations_public_insert_pending
on public.reservations
for insert
to anon, authenticated
with check (
  status = 'pending'
  and car_id is not null
  and agency_id is not null
);

create policy reservations_owner_all
on public.reservations
for all
to authenticated
using (public.is_super_owner())
with check (public.is_super_owner());

create policy reservations_agency_select_verified
on public.reservations
for select
to authenticated
using (
  status = 'verified'
  and agency_id = any(public.current_agency_ids())
);

create policy "debug authenticated read reservations"
on public.reservations
for select
to authenticated
using (true);

create policy "debug authenticated update reservations"
on public.reservations
for update
to authenticated
using (true)
with check (true);

create policy owner_whatsapp_notifications_public_insert
on public.owner_whatsapp_notifications
for insert
to anon, authenticated
with check (
  status = 'pending'
  and reservation_id is not null
);

create policy owner_whatsapp_notifications_owner_all
on public.owner_whatsapp_notifications
for all
to authenticated
using (public.is_super_owner())
with check (public.is_super_owner());

commit;
