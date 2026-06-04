begin;

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
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

create or replace function public.sync_identity_role(
  target_user_id uuid,
  target_email text,
  target_role text,
  target_agency_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.users') is not null then
    insert into public.users (id, email, role, agency_id)
    values (target_user_id, target_email, target_role, target_agency_id)
    on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        agency_id = excluded.agency_id,
        updated_at = now();
  end if;

  if to_regclass('public.profiles') is not null then
    insert into public.profiles (id, email, full_name, role, agency_id)
    values (
      target_user_id,
      target_email,
      case target_role
        when 'super_owner' then 'Super Owner'
        when 'agency' then 'Test Agency'
        else 'Test Client'
      end,
      target_role,
      target_agency_id
    )
    on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        agency_id = excluded.agency_id,
        updated_at = now();
  end if;
end;
$$;

do $$
declare
  seed record;
  auth_user_id uuid;
begin
  for seed in
    select *
    from (
      values
        ('00000000-0000-4000-8000-000000000101'::uuid, 'owner123@test.com', 'CHANGE_ME_SUPER_OWNER_PASSWORD', 'super_owner', 'Super Owner'),
        ('00000000-0000-4000-8000-000000000102'::uuid, 'agency123@test.com', 'CHANGE_ME_AGENCY_PASSWORD', 'agency', 'Test Agency'),
        ('00000000-0000-4000-8000-000000000103'::uuid, 'client123@test.com', 'CHANGE_ME_CLIENT_PASSWORD', 'client', 'Test Client')
    ) as seed_users(id, email, password, app_role, full_name)
  loop
    select id
    into auth_user_id
    from auth.users
    where lower(email) = lower(seed.email)
    limit 1;

    if auth_user_id is null then
      auth_user_id := seed.id;

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        is_super_admin,
        is_sso_user
      )
      values (
        '00000000-0000-0000-0000-000000000000'::uuid,
        auth_user_id,
        'authenticated',
        'authenticated',
        seed.email,
        crypt(seed.password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('role', seed.app_role, 'full_name', seed.full_name),
        now(),
        now(),
        '',
        '',
        '',
        '',
        false,
        false
      );
    else
      update auth.users
      set encrypted_password = crypt(seed.password, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email']),
          raw_user_meta_data = jsonb_build_object('role', seed.app_role, 'full_name', seed.full_name),
          updated_at = now()
      where id = auth_user_id;
    end if;

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      auth_user_id::text,
      auth_user_id,
      jsonb_build_object(
        'sub', auth_user_id::text,
        'email', seed.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider_id, provider) do update
    set user_id = excluded.user_id,
        identity_data = excluded.identity_data,
        updated_at = now();

    perform public.sync_identity_role(auth_user_id, seed.email, seed.app_role, null);
  end loop;
end;
$$;

commit;

do $$
begin
  raise notice 'Development test users are ready:';
  raise notice 'Super Owner: owner123@test.com / CHANGE_ME_SUPER_OWNER_PASSWORD / role super_owner';
  raise notice 'Agency: agency123@test.com / CHANGE_ME_AGENCY_PASSWORD / role agency';
  raise notice 'Client: client123@test.com / CHANGE_ME_CLIENT_PASSWORD / role client';
end;
$$;

select
  auth_users.id,
  auth_users.email,
  coalesce(public_users.role, profiles.role) as app_role,
  auth_users.email_confirmed_at is not null as email_confirmed
from auth.users auth_users
left join public.users public_users on public_users.id = auth_users.id
left join public.profiles profiles on profiles.id = auth_users.id
where auth_users.email in (
  'owner123@test.com',
  'agency123@test.com',
  'client123@test.com'
)
order by auth_users.email;
