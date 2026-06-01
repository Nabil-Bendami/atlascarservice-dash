alter table if exists public.agencies
  add column if not exists is_blocked boolean not null default false;

update public.agencies
set is_blocked = false
where is_blocked is null;

create index if not exists agencies_public_visibility_idx
  on public.agencies(status, is_verified, is_blocked);

create or replace view public.owner_agencies_view as
with traffic_by_agency as (
  select
    agency_id,
    count(*)::bigint as total_traffic
  from public.traffic_events
  where agency_id is not null
  group by agency_id
)
select
  a.id,
  a.owner_user_id,
  a.email,
  coalesce(a.name, '') as name,
  a.logo_url as logo,
  a.cover_url as cover_image,
  a.city_id,
  c.name as city_name,
  coalesce(r.name, a.region, '') as region,
  a.address,
  a.phone,
  a.whatsapp,
  a.description,
  a.latitude,
  a.longitude,
  a.status,
  a.is_verified as verified,
  coalesce(ast.total_cars, 0)::bigint as cars_count,
  coalesce(ast.total_reservations, 0)::bigint as reservations_count,
  coalesce(ast.total_revenue, 0)::numeric(14,2) as estimated_revenue,
  coalesce(ast.views_count, 0)::bigint as views,
  case
    when coalesce(t.total_traffic, 0) = 0 then 0::numeric
    else round((coalesce(ast.total_reservations, 0)::numeric / t.total_traffic::numeric) * 100, 2)
  end as conversion_rate,
  a.is_blocked
from public.agencies a
left join public.cities c on c.id = a.city_id
left join public.regions r on r.id = c.region_id
left join public.agency_stats_view ast on ast.agency_id = a.id
left join traffic_by_agency t on t.agency_id = a.id;

drop policy if exists agencies_public_read_active_verified on public.agencies;
create policy agencies_public_read_active_verified
on public.agencies
for select
to anon, authenticated
using (status = 'active' and is_verified = true and coalesce(is_blocked, false) = false);

drop policy if exists cars_public_read_active_available on public.cars;
create policy cars_public_read_active_available
on public.cars
for select
to anon, authenticated
using (
  status = 'active'
  and coalesce(availability, 'available') = 'available'
  and exists (
    select 1
    from public.agencies a
    where a.id = cars.agency_id
      and a.status = 'active'
      and a.is_verified = true
      and coalesce(a.is_blocked, false) = false
  )
);

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
      and c.status = 'active'
      and coalesce(c.availability, 'available') = 'available'
      and a.status = 'active'
      and a.is_verified = true
      and coalesce(a.is_blocked, false) = false
  )
);
