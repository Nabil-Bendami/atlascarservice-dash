begin;

alter table public.cars enable row level security;

alter table public.cars
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists transmission text,
  add column if not exists fuel_type text,
  add column if not exists seats integer,
  add column if not exists matricule text,
  add column if not exists description text,
  add column if not exists deleted_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists archived boolean not null default false;

alter table public.cars drop constraint if exists cars_status_valid_check;
alter table public.cars
  add constraint cars_status_valid_check
  check (lower(status) in ('active', 'available', 'disponible', 'approved', 'published', 'verified', 'unavailable', 'indisponible', 'rented', 'booked', 'maintenance', 'inactive', 'draft', 'archived', 'deleted'))
  not valid;

drop policy if exists cars_agency_user_manage_own on public.cars;
create policy cars_agency_user_manage_own
on public.cars
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('super_owner', 'owner', 'admin')
        or p.agency_id = cars.agency_id
      )
  )
  or exists (
    select 1
    from public.agencies a
    where a.id = cars.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('super_owner', 'owner', 'admin')
        or p.agency_id = cars.agency_id
      )
  )
  or exists (
    select 1
    from public.agencies a
    where a.id = cars.agency_id
      and a.owner_user_id = auth.uid()
  )
);

drop policy if exists cars_public_read on public.cars;
drop policy if exists cars_public_read_active_available on public.cars;
create policy cars_public_read_active_available
on public.cars
for select
to anon, authenticated
using (
  deleted_at is null
  and coalesce(is_deleted, false) = false
  and coalesce(archived, false) = false
  and lower(coalesce(status, 'active')) not in ('deleted', 'archived', 'inactive')
  and exists (
    select 1
    from public.agencies a
    where a.id = cars.agency_id
      and a.status = 'active'
      and coalesce(a.is_blocked, false) = false
      and coalesce(a.is_suspended, false) = false
      and coalesce(a.deleted_at, null) is null
  )
);

drop policy if exists car_images_public_read on public.car_images;
drop policy if exists car_images_public_read_for_public_cars on public.car_images;
create policy car_images_public_read_for_public_cars
on public.car_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.cars c
    join public.agencies a on a.id = c.agency_id
    where c.id = car_images.car_id
      and c.deleted_at is null
      and coalesce(c.is_deleted, false) = false
      and coalesce(c.archived, false) = false
      and lower(coalesce(c.status, 'active')) not in ('deleted', 'archived', 'inactive')
      and a.status = 'active'
      and coalesce(a.is_blocked, false) = false
      and coalesce(a.is_suspended, false) = false
      and coalesce(a.deleted_at, null) is null
  )
);

update public.cars
set deleted_at = null
where deleted_at is not null
  and coalesce(is_deleted, false) = false
  and coalesce(archived, false) = false
  and lower(coalesce(status, 'active')) not in ('deleted', 'archived', 'inactive');

update public.cars
set
  deleted_at = coalesce(deleted_at, now()),
  status = 'deleted',
  is_deleted = true,
  archived = true
where lower(trim(coalesce(name, concat_ws(' ', brand, model), ''))) = 'dacia car';

create or replace view public.owner_cars_view as
select
  car.id,
  car.agency_id,
  a.name as agency_name,
  a.city_id,
  c.name as city_name,
  coalesce(
    array_remove(array_agg(ci.image_url order by ci.id), null),
    '{}'::text[]
  ) as photos,
  car.brand,
  car.model,
  car.year,
  car.price_per_day,
  coalesce(car.availability::text, 'available') as availability,
  coalesce(cs.total_reservations, 0)::bigint as reservations_count,
  coalesce(cs.total_rental_days, 0)::bigint as total_rented_days,
  coalesce(cs.total_revenue, 0)::numeric(14,2) as estimated_revenue,
  coalesce(cs.views_count, 0)::bigint as views,
  coalesce(cs.whatsapp_clicks, 0)::bigint as whatsapp_clicks,
  coalesce(cs.phone_clicks, 0)::bigint as phone_clicks,
  car.status,
  car.name,
  car.category,
  car.transmission,
  car.fuel_type,
  car.seats,
  car.matricule,
  car.description,
  car.deleted_at,
  car.is_deleted,
  car.archived
from public.cars car
join public.agencies a on a.id = car.agency_id
left join public.cities c on c.id = a.city_id
left join public.car_images ci on ci.car_id = car.id
left join public.car_stats_view cs on cs.car_id = car.id
group by
  car.id,
  a.name,
  a.city_id,
  c.name,
  cs.total_reservations,
  cs.total_rental_days,
  cs.total_revenue,
  cs.views_count,
  cs.whatsapp_clicks,
  cs.phone_clicks;

commit;
