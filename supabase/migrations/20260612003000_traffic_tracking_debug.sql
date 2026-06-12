begin;

create extension if not exists pgcrypto;

create table if not exists public.traffic_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  visitor_id text,
  session_id text,
  city text,
  country text,
  agency_id uuid null references public.agencies(id) on delete set null,
  car_id uuid null references public.cars(id) on delete set null,
  page_path text,
  page_url text,
  referrer text,
  domain text,
  user_agent text,
  device text,
  browser text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.traffic_events
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists event_type text,
  add column if not exists visitor_id text,
  add column if not exists session_id text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists agency_id uuid null references public.agencies(id) on delete set null,
  add column if not exists car_id uuid null references public.cars(id) on delete set null,
  add column if not exists page_path text,
  add column if not exists page_url text,
  add column if not exists referrer text,
  add column if not exists domain text,
  add column if not exists user_agent text,
  add column if not exists device text,
  add column if not exists browser text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists city_id int references public.cities(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists event_source text,
  add column if not exists ip_address inet,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

update public.traffic_events
set event_type = 'visit'
where event_type is null or trim(event_type) = '';

update public.traffic_events
set created_at = now()
where created_at is null;

update public.traffic_events
set metadata = '{}'::jsonb
where metadata is null;

update public.traffic_events te
set city = coalesce(nullif(trim(te.city), ''), c.name)
from public.cities c
where te.city_id = c.id
  and (te.city is null or trim(te.city) = '');

alter table public.traffic_events
  alter column event_type set not null,
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column metadata set not null,
  alter column metadata set default '{}'::jsonb;

create index if not exists traffic_events_created_idx on public.traffic_events(created_at desc);
create index if not exists traffic_events_type_created_idx on public.traffic_events(event_type, created_at desc);
create index if not exists traffic_events_visitor_created_idx on public.traffic_events(visitor_id, created_at desc);
create index if not exists traffic_events_session_created_idx on public.traffic_events(session_id, created_at desc);
create index if not exists traffic_events_city_created_idx on public.traffic_events(city, created_at desc);
create index if not exists traffic_events_domain_created_idx on public.traffic_events(domain, created_at desc);
create index if not exists traffic_events_agency_created_idx on public.traffic_events(agency_id, created_at desc);
create index if not exists traffic_events_car_created_idx on public.traffic_events(car_id, created_at desc);

insert into public.cities (name, latitude, longitude)
values
  ('Safi', 32.2994, -9.2372),
  ('Essaouira', 31.5085, -9.7595),
  ('El Jadida', 33.2316, -8.5007),
  ('Meknès', 33.8935, -5.5473),
  ('Oujda', 34.6814, -1.9086),
  ('Tétouan', 35.5785, -5.3684),
  ('Kénitra', 34.261, -6.5802),
  ('Mohammedia', 33.6835, -7.3849),
  ('Laâyoune', 27.1253, -13.1625),
  ('Unknown', 31.7917, -7.0926)
on conflict (name) do update
set
  latitude = excluded.latitude,
  longitude = excluded.longitude;

alter table public.traffic_events enable row level security;

drop policy if exists traffic_events_public_insert_tracking on public.traffic_events;
create policy traffic_events_public_insert_tracking
on public.traffic_events
for insert
to anon, authenticated
with check (
  event_type in ('visit', 'search', 'car_view', 'view', 'phone_click', 'whatsapp_click', 'reservation')
  and coalesce(length(trim(visitor_id)), 0) > 0
  and coalesce(length(trim(session_id)), 0) > 0
);

drop policy if exists "Allow public insert traffic events" on public.traffic_events;
create policy "Allow public insert traffic events"
on public.traffic_events
for insert
to anon, authenticated
with check (
  event_type in ('visit', 'page_view', 'click', 'reservation_click', 'whatsapp_click', 'phone_click', 'search', 'car_view', 'view', 'reservation')
);

drop policy if exists traffic_events_super_owner_all on public.traffic_events;
create policy traffic_events_super_owner_all
on public.traffic_events
for all
to authenticated
using (public.is_super_owner())
with check (public.is_super_owner());

create or replace function public.traffic_event_price(event_metadata jsonb)
returns numeric
language sql
immutable
as $$
  select coalesce(
    case
      when coalesce(event_metadata->>'price', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (event_metadata->>'price')::numeric
      else null
    end,
    case
      when coalesce(event_metadata->>'total_price', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (event_metadata->>'total_price')::numeric
      else null
    end,
    0::numeric
  );
$$;

create or replace function public.get_traffic_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with metrics as (
    select
      count(*) filter (where event_type = 'visit')::bigint as visitors,
      count(distinct visitor_id) filter (where event_type = 'visit' and visitor_id is not null)::bigint as unique_visitors,
      count(*) filter (where event_type = 'search')::bigint as searches,
      count(*) filter (where event_type = 'whatsapp_click')::bigint as whatsapp_clicks,
      count(*) filter (where event_type = 'phone_click')::bigint as phone_clicks,
      count(*) filter (where event_type = 'reservation')::bigint as reservations,
      coalesce(sum(public.traffic_event_price(metadata)) filter (where event_type = 'reservation'), 0)::numeric as revenue
    from public.traffic_events
  )
  select jsonb_build_object(
    'visitors', visitors,
    'uniqueVisitors', unique_visitors,
    'searches', searches,
    'whatsappClicks', whatsapp_clicks,
    'phoneClicks', phone_clicks,
    'reservations', reservations,
    'revenue', revenue,
    'conversion', case when visitors > 0 then round((reservations::numeric / visitors::numeric) * 100, 1) else 0 end
  )
  from metrics;
$$;

create or replace function public.get_traffic_by_city()
returns table(
  city_id text,
  city_name text,
  country text,
  latitude double precision,
  longitude double precision,
  visitors bigint,
  unique_visitors bigint,
  searches bigint,
  car_views bigint,
  whatsapp_clicks bigint,
  phone_clicks bigint,
  reservations bigint,
  conversion_rate numeric,
  agencies_count bigint,
  cars_count bigint,
  revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with city_events as (
    select
      coalesce(nullif(trim(te.city), ''), 'Unknown') as resolved_city,
      coalesce(nullif(trim(te.country), ''), 'Morocco') as resolved_country,
      te.*
    from public.traffic_events te
  ),
  event_rollup as (
    select
      resolved_city,
      min(resolved_country) as resolved_country,
      count(*) filter (where event_type = 'visit')::bigint as visitors,
      count(distinct visitor_id) filter (where event_type = 'visit' and visitor_id is not null)::bigint as unique_visitors,
      count(*) filter (where event_type = 'search')::bigint as searches,
      count(*) filter (where event_type in ('car_view', 'view'))::bigint as car_views,
      count(*) filter (where event_type = 'whatsapp_click')::bigint as whatsapp_clicks,
      count(*) filter (where event_type = 'phone_click')::bigint as phone_clicks,
      count(*) filter (where event_type = 'reservation')::bigint as reservations,
      coalesce(sum(public.traffic_event_price(metadata)) filter (where event_type = 'reservation'), 0)::numeric as revenue
    from city_events
    group by resolved_city
  ),
  city_supply as (
    select
      c.name as supply_city,
      count(distinct a.id)::bigint as agencies_count,
      count(distinct car.id)::bigint as cars_count
    from public.cities c
    left join public.agencies a on a.city_id = c.id
    left join public.cars car on car.agency_id = a.id
    group by c.name
  )
  select
    er.resolved_city as city_id,
    er.resolved_city as city_name,
    er.resolved_country as country,
    coalesce(c.latitude, case when er.resolved_city = 'Unknown' then 31.7917 end, 0) as latitude,
    coalesce(c.longitude, case when er.resolved_city = 'Unknown' then -7.0926 end, 0) as longitude,
    er.visitors,
    er.unique_visitors,
    er.searches,
    er.car_views,
    er.whatsapp_clicks,
    er.phone_clicks,
    er.reservations,
    case when er.visitors > 0 then round((er.reservations::numeric / er.visitors::numeric) * 100, 1) else 0 end as conversion_rate,
    coalesce(cs.agencies_count, 0)::bigint as agencies_count,
    coalesce(cs.cars_count, 0)::bigint as cars_count,
    er.revenue
  from event_rollup er
  left join public.cities c on lower(c.name) = lower(er.resolved_city)
  left join city_supply cs on lower(cs.supply_city) = lower(er.resolved_city)
  order by er.visitors desc, er.resolved_city asc;
$$;

create or replace function public.get_traffic_daily_evolution()
returns table(name text, visitors bigint, searches bigint, reservations bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(day::date, 'YYYY-MM-DD') as name,
    count(te.id) filter (where te.event_type = 'visit')::bigint as visitors,
    count(te.id) filter (where te.event_type = 'search')::bigint as searches,
    count(te.id) filter (where te.event_type = 'reservation')::bigint as reservations
  from generate_series((current_date - interval '29 days')::date, current_date, interval '1 day') day
  left join public.traffic_events te
    on te.created_at >= day
   and te.created_at < day + interval '1 day'
  group by day
  order by day;
$$;

create or replace function public.get_traffic_city_charts(selected_city text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with scoped_events as (
    select *
    from public.traffic_events te
    where lower(coalesce(nullif(trim(te.city), ''), 'Unknown')) = lower(coalesce(nullif(trim(selected_city), ''), 'Unknown'))
  ),
  trend as (
    select
      to_char(day::date, 'YYYY-MM-DD') as name,
      count(se.id) filter (where se.event_type = 'visit')::bigint as visitors,
      count(se.id) filter (where se.event_type = 'search')::bigint as searches,
      count(se.id) filter (where se.event_type = 'reservation')::bigint as reservations
    from generate_series((current_date - interval '29 days')::date, current_date, interval '1 day') day
    left join scoped_events se
      on se.created_at >= day
     and se.created_at < day + interval '1 day'
    group by day
    order by day
  ),
  metrics as (
    select
      count(*) filter (where event_type = 'search')::bigint as searches,
      count(*) filter (where event_type in ('car_view', 'view'))::bigint as views,
      count(*) filter (where event_type in ('whatsapp_click', 'phone_click'))::bigint as clicks
    from scoped_events
  )
  select jsonb_build_object(
    'trend',
    coalesce((select jsonb_agg(jsonb_build_object('name', name, 'value', visitors, 'visitors', visitors, 'searches', searches, 'reservations', reservations)) from trend), '[]'::jsonb),
    'channelMix',
    jsonb_build_array(
      jsonb_build_object('name', 'Searches', 'value', coalesce((select searches from metrics), 0)),
      jsonb_build_object('name', 'Views', 'value', coalesce((select views from metrics), 0)),
      jsonb_build_object('name', 'Clicks', 'value', coalesce((select clicks from metrics), 0))
    )
  );
$$;

create or replace function public.get_traffic_debug_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_traffic_count bigint := null;
  v_traffic_events_count bigint := null;
  v_analytics_count bigint := null;
  v_latest_events jsonb := '[]'::jsonb;
  v_dashboard_rows jsonb := '[]'::jsonb;
  v_city_counts jsonb := '[]'::jsonb;
  v_daily jsonb := '[]'::jsonb;
  v_summary jsonb := '{}'::jsonb;
begin
  if to_regclass('public.traffic') is not null then
    execute 'select count(*) from public.traffic' into v_traffic_count;
  end if;

  if to_regclass('public.traffic_events') is not null then
    execute 'select count(*) from public.traffic_events' into v_traffic_events_count;

    select coalesce(jsonb_agg(row_to_json(events)), '[]'::jsonb)
    into v_latest_events
    from (
      select
        id,
        created_at,
        event_type,
        visitor_id,
        session_id,
        city,
        country,
        agency_id,
        car_id,
        page_path,
        page_url,
        referrer,
        domain,
        user_agent,
        device,
        browser,
        metadata
      from public.traffic_events
      order by created_at desc
      limit 50
    ) events;
  end if;

  if to_regclass('public.analytics') is not null then
    execute 'select count(*) from public.analytics' into v_analytics_count;
  end if;

  select public.get_traffic_summary() into v_summary;

  select coalesce(jsonb_agg(row_to_json(metrics)), '[]'::jsonb)
  into v_dashboard_rows
  from (
    select *
    from public.get_traffic_by_city()
  ) metrics;

  select coalesce(jsonb_agg(row_to_json(counts)), '[]'::jsonb)
  into v_city_counts
  from (
    select
      city_name,
      visitors,
      unique_visitors,
      searches,
      whatsapp_clicks,
      phone_clicks,
      reservations,
      revenue,
      conversion_rate
    from public.get_traffic_by_city()
  ) counts;

  select coalesce(jsonb_agg(row_to_json(days)), '[]'::jsonb)
  into v_daily
  from (
    select *
    from public.get_traffic_daily_evolution()
  ) days;

  return jsonb_build_object(
    'tables', jsonb_build_object(
      'traffic', jsonb_build_object('exists', to_regclass('public.traffic') is not null, 'rowCount', v_traffic_count),
      'traffic_events', jsonb_build_object('exists', to_regclass('public.traffic_events') is not null, 'rowCount', v_traffic_events_count),
      'analytics', jsonb_build_object('exists', to_regclass('public.analytics') is not null, 'rowCount', v_analytics_count)
    ),
    'summary', v_summary,
    'latestEvents', v_latest_events,
    'dashboardRows', v_dashboard_rows,
    'cityCounts', v_city_counts,
    'dailyEvolution', v_daily
  );
end;
$$;

grant execute on function public.get_traffic_summary() to authenticated;
grant execute on function public.get_traffic_by_city() to authenticated;
grant execute on function public.get_traffic_daily_evolution() to authenticated;
grant execute on function public.get_traffic_city_charts(text) to authenticated;
grant execute on function public.get_traffic_debug_snapshot() to authenticated;

commit;
