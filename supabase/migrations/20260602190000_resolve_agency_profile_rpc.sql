create or replace function public.resolve_agency_profile()
returns table (
  id uuid,
  email text,
  role text,
  agency_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_profile record;
begin
  if v_uid is null and v_email is null then
    return;
  end if;

  select u.id, lower(u.email) as email, u.role, u.agency_id
  into v_profile
  from public.users u
  where (v_uid is not null and u.id = v_uid)
     or (v_email is not null and lower(u.email) = v_email)
  order by
    case when v_uid is not null and u.id = v_uid then 0 else 1 end,
    case when u.role = 'agency' and u.agency_id is not null then 0 else 1 end,
    u.created_at desc nulls last
  limit 1;

  if v_profile.id is not null and v_profile.role = 'agency' and v_profile.agency_id is not null then
    id := v_profile.id;
    email := v_profile.email;
    role := v_profile.role;
    agency_id := v_profile.agency_id;
    return next;
    return;
  end if;

  select p.id, lower(p.email) as email, p.role, p.agency_id
  into v_profile
  from public.profiles p
  where (v_uid is not null and p.id = v_uid)
     or (v_email is not null and lower(p.email) = v_email)
  order by
    case when v_uid is not null and p.id = v_uid then 0 else 1 end,
    case when p.role = 'agency' and p.agency_id is not null then 0 else 1 end,
    p.created_at desc nulls last
  limit 1;

  if v_profile.id is not null and v_profile.role = 'agency' and v_profile.agency_id is not null then
    id := v_profile.id;
    email := v_profile.email;
    role := v_profile.role;
    agency_id := v_profile.agency_id;
    return next;
    return;
  end if;

  select coalesce(a.owner_user_id, v_uid) as id,
         lower(coalesce(a.email, v_email)) as email,
         'agency'::text as role,
         a.id as agency_id
  into v_profile
  from public.agencies a
  where (v_uid is not null and a.owner_user_id = v_uid)
     or (v_email is not null and lower(a.email) = v_email)
  order by
    case when v_uid is not null and a.owner_user_id = v_uid then 0 else 1 end,
    a.created_at desc nulls last
  limit 1;

  if v_profile.agency_id is not null then
    id := v_profile.id;
    email := v_profile.email;
    role := v_profile.role;
    agency_id := v_profile.agency_id;
    return next;
  end if;
end;
$$;

revoke all on function public.resolve_agency_profile() from public;
grant execute on function public.resolve_agency_profile() to authenticated;
