begin;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'client',
  agency_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'client',
  agency_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists agency_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.users
  alter column role set default 'client';

update public.users
set role = 'client'
where role is null;

alter table public.users
  alter column role set not null;

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text,
  add column if not exists agency_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  alter column role set default 'client';

update public.profiles
set role = 'client'
where role is null;

alter table public.profiles
  alter column role set not null;

do $$
begin
  if to_regclass('public.agencies') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'users_agency_id_fkey'
  ) then
    alter table public.users
      add constraint users_agency_id_fkey
      foreign key (agency_id)
      references public.agencies(id)
      on delete set null;
  end if;

  if to_regclass('public.agencies') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_agency_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_agency_id_fkey
      foreign key (agency_id)
      references public.agencies(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists users_email_idx on public.users (email);
create index if not exists users_role_idx on public.users (role);
create index if not exists users_agency_id_idx on public.users (agency_id);
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_agency_id_idx on public.profiles (agency_id);

create or replace function public.identity_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_identity_set_updated_at on public.users;
create trigger users_identity_set_updated_at
before update on public.users
for each row
execute function public.identity_set_updated_at();

drop trigger if exists profiles_identity_set_updated_at on public.profiles;
create trigger profiles_identity_set_updated_at
before update on public.profiles
for each row
execute function public.identity_set_updated_at();

create or replace function public.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '')
$$;

create or replace function public.resolve_profile_identity(
  p_user_id uuid default auth.uid(),
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := p_user_id;
  v_email text := nullif(lower(trim(coalesce(p_email, auth.jwt() ->> 'email', ''))), '');
  v_profile_by_id public.profiles%rowtype;
  v_user_by_id public.users%rowtype;
  v_profile_by_email public.profiles%rowtype;
  v_user_by_email public.users%rowtype;
  v_agency_by_owner public.agencies%rowtype;
  v_agency_by_email public.agencies%rowtype;
  v_profile public.profiles%rowtype;
  v_user public.users%rowtype;
  v_role text;
  v_agency_id uuid;
  v_full_name text;
begin
  if v_user_id is null and v_email is not null then
    select au.id
    into v_user_id
    from auth.users au
    where lower(trim(coalesce(au.email, ''))) = v_email
    order by au.created_at desc
    limit 1;
  end if;

  if v_user_id is null then
    return null;
  end if;

  select *
  into v_profile_by_id
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  select *
  into v_user_by_id
  from public.users u
  where u.id = v_user_id
  limit 1;

  if v_email is not null then
    select *
    into v_profile_by_email
    from public.profiles p
    where lower(trim(coalesce(p.email, ''))) = v_email
    order by
      case when p.role = 'agency' then 0 else 1 end,
      p.created_at desc nulls last
    limit 1;

    select *
    into v_user_by_email
    from public.users u
    where lower(trim(coalesce(u.email, ''))) = v_email
    order by
      case when u.role = 'agency' then 0 else 1 end,
      u.created_at desc nulls last
    limit 1;
  end if;

  if to_regclass('public.agencies') is not null then
    select *
    into v_agency_by_owner
    from public.agencies a
    where a.owner_user_id = v_user_id
    order by a.created_at desc nulls last
    limit 1;

    if v_agency_by_owner.id is null and v_email is not null then
      select *
      into v_agency_by_email
      from public.agencies a
      where lower(trim(coalesce(a.email, ''))) = v_email
      order by a.created_at desc nulls last
      limit 1;
    end if;
  end if;

  v_email := coalesce(
    v_email,
    nullif(lower(trim(coalesce(v_profile_by_id.email, ''))), ''),
    nullif(lower(trim(coalesce(v_user_by_id.email, ''))), ''),
    nullif(lower(trim(coalesce(v_profile_by_email.email, ''))), ''),
    nullif(lower(trim(coalesce(v_user_by_email.email, ''))), ''),
    nullif(lower(trim(coalesce(v_agency_by_owner.email, ''))), ''),
    nullif(lower(trim(coalesce(v_agency_by_email.email, ''))), '')
  );

  v_agency_id := coalesce(
    v_profile_by_id.agency_id,
    v_user_by_id.agency_id,
    v_profile_by_email.agency_id,
    v_user_by_email.agency_id,
    v_agency_by_owner.id,
    v_agency_by_email.id
  );

  v_role := coalesce(
    nullif(v_profile_by_id.role, ''),
    nullif(v_user_by_id.role, ''),
    nullif(v_profile_by_email.role, ''),
    nullif(v_user_by_email.role, '')
  );

  if v_agency_id is not null and coalesce(v_role, '') not in ('super_owner', 'owner') then
    v_role := 'agency';
  end if;

  v_full_name := coalesce(
    nullif(v_profile_by_id.full_name, ''),
    nullif(v_profile_by_email.full_name, ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(v_agency_by_owner.name, ''),
    nullif(v_agency_by_email.name, '')
  );

  if to_regclass('public.agencies') is not null then
    if v_agency_by_owner.id is not null and v_agency_by_owner.owner_user_id is distinct from v_user_id then
      update public.agencies
      set owner_user_id = v_user_id
      where id = v_agency_by_owner.id;
    elsif v_agency_by_email.id is not null and v_agency_by_email.owner_user_id is distinct from v_user_id then
      update public.agencies
      set owner_user_id = v_user_id
      where id = v_agency_by_email.id;
    end if;
  end if;

  if v_email is not null or v_role is not null or v_agency_id is not null then
    insert into public.profiles (
      id,
      email,
      full_name,
      role,
      agency_id,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      v_email,
      v_full_name,
      coalesce(v_role, 'client'),
      v_agency_id,
      now(),
      now()
    )
    on conflict (id) do update
    set
      email = coalesce(excluded.email, public.profiles.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      role = case
        when excluded.agency_id is not null and coalesce(public.profiles.role, '') not in ('super_owner', 'owner') then 'agency'
        else coalesce(public.profiles.role, excluded.role, 'client')
      end,
      agency_id = coalesce(public.profiles.agency_id, excluded.agency_id),
      updated_at = now();

    insert into public.users (
      id,
      email,
      role,
      agency_id,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      v_email,
      coalesce(v_role, 'client'),
      v_agency_id,
      now(),
      now()
    )
    on conflict (id) do update
    set
      email = coalesce(excluded.email, public.users.email),
      role = case
        when excluded.agency_id is not null and coalesce(public.users.role, '') not in ('super_owner', 'owner') then 'agency'
        else coalesce(public.users.role, excluded.role, 'client')
      end,
      agency_id = coalesce(public.users.agency_id, excluded.agency_id),
      updated_at = now();
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  select *
  into v_user
  from public.users u
  where u.id = v_user_id
  limit 1;

  return jsonb_build_object(
    'id', v_user_id,
    'email', coalesce(v_profile.email, v_user.email, v_email),
    'full_name', coalesce(v_profile.full_name, v_full_name),
    'role', coalesce(v_profile.role, v_user.role, v_role),
    'agency_id', coalesce(v_profile.agency_id, v_user.agency_id, v_agency_id),
    'created_at', coalesce(v_profile.created_at, v_user.created_at),
    'updated_at', coalesce(v_profile.updated_at, v_user.updated_at)
  );
end;
$$;

create or replace function public.get_current_profile()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return public.resolve_profile_identity(auth.uid(), public.current_auth_email());
end;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select nullif(public.get_current_profile() ->> 'role', '')
$$;

create or replace function public.current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select nullif(public.get_current_profile() ->> 'agency_id', '')::uuid
$$;

create or replace function public.get_auth_debug_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_profile jsonb;
begin
  v_profile := public.get_current_profile();

  return jsonb_build_object(
    'authenticated', auth.uid() is not null,
    'user_id', auth.uid(),
    'email', public.current_auth_email(),
    'role', coalesce(v_profile ->> 'role', null),
    'agency_id', coalesce(v_profile ->> 'agency_id', null),
    'profile', v_profile,
    'jwt_claims', auth.jwt()
  );
end;
$$;

create or replace function public.repair_agency_identity_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_user_id uuid;
begin
  if v_email is null then
    return null;
  end if;

  select au.id
  into v_user_id
  from auth.users au
  where lower(trim(coalesce(au.email, ''))) = v_email
  order by au.created_at desc
  limit 1;

  if v_user_id is null then
    return jsonb_build_object(
      'status', 'auth_user_missing',
      'email', v_email
    );
  end if;

  return jsonb_build_object(
    'status', 'repaired',
    'email', v_email,
    'profile', public.resolve_profile_identity(v_user_id, v_email)
  );
end;
$$;

do $$
begin
  perform public.repair_agency_identity_by_email('nabilbendami5@gmail.com');
exception
  when others then
    raise notice 'Agency identity repair skipped for nabilbendami5@gmail.com: %', sqlerrm;
end;
$$;

commit;
