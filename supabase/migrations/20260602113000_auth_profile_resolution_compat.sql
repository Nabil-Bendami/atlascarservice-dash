-- Additive auth/profile resolution compatibility layer for the agency site.
-- This lets authenticated agency users resolve their profile by auth uid first,
-- then by email, and finally self-heals a missing profile from public.agencies.

begin;

create or replace function public.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.resolve_current_profile()
returns public.profiles
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_email text;
  v_agency_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if found then
    return v_profile;
  end if;

  v_email := public.current_auth_email();

  if v_email is null or v_email = '' then
    return null;
  end if;

  select *
  into v_profile
  from public.profiles p
  where lower(coalesce(p.email, '')) = v_email
  order by
    case when p.role = 'agency' then 0 else 1 end,
    p.created_at desc nulls last
  limit 1;

  if found then
    return v_profile;
  end if;

  select a.id
  into v_agency_id
  from public.agencies a
  where lower(coalesce(a.email, '')) = v_email
  order by a.created_at desc nulls last
  limit 1;

  if v_agency_id is null then
    return null;
  end if;

  insert into public.profiles (
    id,
    agency_id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  values (
    auth.uid(),
    v_agency_id,
    v_email,
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name'),
    'agency',
    now(),
    now()
  )
  on conflict (id) do update
  set
    agency_id = excluded.agency_id,
    email = excluded.email,
    role = coalesce(public.profiles.role, excluded.role),
    updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.get_current_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  v_profile := public.resolve_current_profile();
  return to_jsonb(v_profile);
end;
$$;

create or replace function public.get_auth_debug_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  v_profile := public.resolve_current_profile();

  return jsonb_build_object(
    'authenticated', auth.uid() is not null,
    'user_id', auth.uid(),
    'email', nullif(public.current_auth_email(), ''),
    'role', coalesce(v_profile.role, null),
    'agency_id', coalesce(v_profile.agency_id, null),
    'profile', to_jsonb(v_profile),
    'jwt_claims', auth.jwt()
  );
end;
$$;

commit;
