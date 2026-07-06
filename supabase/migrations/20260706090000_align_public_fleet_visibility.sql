begin;

alter table public.agencies
  add column if not exists is_suspended boolean not null default false,
  add column if not exists is_blocked boolean not null default false;

alter table public.agencies enable row level security;
alter table public.cars enable row level security;
alter table public.car_images enable row level security;

do $$
declare
  availability_type text;
  car_deleted_policy text := 'true';
  car_deleted_alias text := 'true';
  agency_deleted_alias text := 'true';
  car_visibility_policy text;
  car_visibility_alias text;
  car_images_visibility text;
  flag_type text;
begin
  select data_type
  into availability_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'cars'
    and column_name = 'availability'
  limit 1;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'deleted_at'
  ) then
    car_deleted_policy := 'cars.deleted_at is null';
    car_deleted_alias := 'c.deleted_at is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agencies' and column_name = 'deleted_at'
  ) then
    agency_deleted_alias := 'a.deleted_at is null';
  end if;

  car_visibility_policy := car_deleted_policy || '
    and lower(coalesce(cars.status, ''active'')) in (''active'', ''available'', ''disponible'', ''approved'', ''published'', ''verified'')';

  car_visibility_alias := car_deleted_alias || '
    and lower(coalesce(c.status, ''active'')) in (''active'', ''available'', ''disponible'', ''approved'', ''published'', ''verified'')';

  if availability_type = 'boolean' then
    car_visibility_policy := car_visibility_policy || ' and cars.availability is distinct from false';
    car_visibility_alias := car_visibility_alias || ' and c.availability is distinct from false';
  elsif availability_type is not null then
    car_visibility_policy := car_visibility_policy || '
      and lower(coalesce(cars.availability::text, ''available'')) not in (''false'', ''0'', ''no'', ''non'', ''unavailable'', ''indisponible'', ''rented'', ''en location'', ''booked'', ''maintenance'', ''en maintenance'', ''deleted'', ''archived'', ''inactive'')';
    car_visibility_alias := car_visibility_alias || '
      and lower(coalesce(c.availability::text, ''available'')) not in (''false'', ''0'', ''no'', ''non'', ''unavailable'', ''indisponible'', ''rented'', ''en location'', ''booked'', ''maintenance'', ''en maintenance'', ''deleted'', ''archived'', ''inactive'')';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'availability_status') then
    car_visibility_policy := car_visibility_policy || '
      and lower(coalesce(cars.availability_status::text, ''available'')) not in (''false'', ''0'', ''no'', ''non'', ''unavailable'', ''indisponible'', ''rented'', ''en location'', ''booked'', ''maintenance'', ''en maintenance'', ''deleted'', ''archived'', ''inactive'')';
    car_visibility_alias := car_visibility_alias || '
      and lower(coalesce(c.availability_status::text, ''available'')) not in (''false'', ''0'', ''no'', ''non'', ''unavailable'', ''indisponible'', ''rented'', ''en location'', ''booked'', ''maintenance'', ''en maintenance'', ''deleted'', ''archived'', ''inactive'')';
  end if;

  foreach car_images_visibility in array array['active', 'is_active', 'published', 'is_published', 'approved', 'verified', 'is_available', 'available'] loop
    select data_type
    into flag_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cars'
      and column_name = car_images_visibility
    limit 1;

    if flag_type = 'boolean' then
      car_visibility_policy := car_visibility_policy || format(' and cars.%I is distinct from false', car_images_visibility);
      car_visibility_alias := car_visibility_alias || format(' and c.%I is distinct from false', car_images_visibility);
    elsif flag_type is not null then
      car_visibility_policy := car_visibility_policy || format(
        ' and lower(coalesce(cars.%I::text, ''true'')) not in (''false'', ''0'', ''no'', ''non'', ''inactive'', ''disabled'', ''rejected'', ''blocked'', ''suspended'')',
        car_images_visibility
      );
      car_visibility_alias := car_visibility_alias || format(
        ' and lower(coalesce(c.%I::text, ''true'')) not in (''false'', ''0'', ''no'', ''non'', ''inactive'', ''disabled'', ''rejected'', ''blocked'', ''suspended'')',
        car_images_visibility
      );
    end if;
  end loop;

  drop policy if exists cars_public_read on public.cars;
  drop policy if exists cars_public_read_active_available on public.cars;
  execute 'create policy cars_public_read_active_available on public.cars
    for select
    to anon, authenticated
    using (
      ' || car_visibility_policy || '
      and exists (
        select 1
        from public.agencies a
        where a.id = cars.agency_id
          and a.status = ''active''
          and a.is_verified = true
          and coalesce(a.is_blocked, false) = false
          and coalesce(a.is_suspended, false) = false
          and ' || agency_deleted_alias || '
      )
    )';

  drop policy if exists car_images_public_read on public.car_images;
  drop policy if exists car_images_public_read_for_public_cars on public.car_images;
  execute 'create policy car_images_public_read_for_public_cars on public.car_images
    for select
    to anon, authenticated
    using (
      exists (
        select 1
        from public.cars c
        join public.agencies a on a.id = c.agency_id
        where c.id = car_images.car_id
          and ' || car_visibility_alias || '
          and a.status = ''active''
          and a.is_verified = true
          and coalesce(a.is_blocked, false) = false
          and coalesce(a.is_suspended, false) = false
          and ' || agency_deleted_alias || '
      )
    )';

  drop view if exists public.public_cars;
  execute 'create view public.public_cars as
    select c.*
    from public.cars c
    join public.agencies a on a.id = c.agency_id
    where ' || car_visibility_alias || '
      and a.status = ''active''
      and a.is_verified = true
      and coalesce(a.is_blocked, false) = false
      and coalesce(a.is_suspended, false) = false
      and ' || agency_deleted_alias;
end $$;

drop policy if exists agencies_public_read on public.agencies;
drop policy if exists agencies_public_read_active_verified on public.agencies;
do $$
declare
  agency_deleted_policy text := 'true';
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agencies' and column_name = 'deleted_at'
  ) then
    agency_deleted_policy := 'deleted_at is null';
  end if;

  execute 'create policy agencies_public_read_active_verified
    on public.agencies
    for select
    to anon, authenticated
    using (
      status = ''active''
      and is_verified = true
      and coalesce(is_blocked, false) = false
      and coalesce(is_suspended, false) = false
      and ' || agency_deleted_policy || '
    )';
end $$;

do $$
begin
  if to_regprocedure('public.current_role()') is not null then
    drop policy if exists cars_owner_admin_manage_all on public.cars;
    create policy cars_owner_admin_manage_all
    on public.cars
    for all
    to authenticated
    using (coalesce(public.current_role() in ('super_owner', 'owner', 'admin'), false))
    with check (coalesce(public.current_role() in ('super_owner', 'owner', 'admin'), false));

    drop policy if exists car_images_owner_admin_manage_all on public.car_images;
    create policy car_images_owner_admin_manage_all
    on public.car_images
    for all
    to authenticated
    using (coalesce(public.current_role() in ('super_owner', 'owner', 'admin'), false))
    with check (coalesce(public.current_role() in ('super_owner', 'owner', 'admin'), false));
  end if;
end $$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists agency_car_media_public_read on storage.objects;
    create policy agency_car_media_public_read
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id in ('agency-media', 'car-media', 'car-images'));
  end if;
end $$;

do $$
declare
  v_agency_id uuid;
  v_car_id uuid;
  v_columns text[] := array['agency_id', 'brand', 'model', 'price_per_day', 'status'];
  v_values text[];
  v_availability_type text;
begin
  alter table public.cars drop constraint if exists cars_status_valid_check;
  alter table public.cars
    add constraint cars_status_valid_check
    check (lower(status) in ('active', 'available', 'disponible', 'approved', 'published', 'verified', 'unavailable', 'indisponible', 'rented', 'booked', 'maintenance', 'inactive', 'draft', 'archived', 'deleted'))
    not valid;

  select id
  into v_agency_id
  from public.agencies
  where status = 'active'
    and coalesce(is_verified, true) = true
    and coalesce(is_blocked, false) = false
    and coalesce(is_suspended, false) = false
  order by created_at nulls last, name
  limit 1;

  if v_agency_id is null then
    raise notice 'Public fleet seed skipped: no active agency found.';
    return;
  end if;

  if exists (
    select 1
    from public.cars
    where agency_id = v_agency_id
      and brand = 'Atlas'
      and model = 'Public Test Vehicle'
  ) then
    raise notice 'Public fleet seed skipped: test vehicle already exists.';
    return;
  end if;

  v_values := array[
    quote_literal(v_agency_id::text),
    quote_literal('Atlas'),
    quote_literal('Public Test Vehicle'),
    '450',
    quote_literal('active')
  ];

  select data_type
  into v_availability_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'cars'
    and column_name = 'availability'
  limit 1;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'name') then
    v_columns := v_columns || array['name'];
    v_values := v_values || array[quote_literal('Atlas Public Test Vehicle')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'category') then
    v_columns := v_columns || array['category'];
    v_values := v_values || array[quote_literal('Premium')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'description') then
    v_columns := v_columns || array['description'];
    v_values := v_values || array[quote_literal('Seed vehicle used to verify public Atlas Cars fleet visibility.')];
  end if;

  if v_availability_type = 'boolean' then
    v_columns := v_columns || array['availability'];
    v_values := v_values || array['true'];
  elsif v_availability_type is not null then
    v_columns := v_columns || array['availability'];
    v_values := v_values || array[quote_literal('available')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'active') then
    v_columns := v_columns || array['active'];
    v_values := v_values || array['true'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'published') then
    v_columns := v_columns || array['published'];
    v_values := v_values || array['true'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'is_available') then
    v_columns := v_columns || array['is_available'];
    v_values := v_values || array['true'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cars' and column_name = 'is_active') then
    v_columns := v_columns || array['is_active'];
    v_values := v_values || array['true'];
  end if;

  execute format(
    'insert into public.cars (%s) values (%s) returning id',
    array_to_string(v_columns, ', '),
    array_to_string(v_values, ', ')
  )
  into v_car_id;

  insert into public.car_images (car_id, image_url, sort_order)
  values (
    v_car_id,
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    0
  )
  on conflict do nothing;
end $$;

commit;
