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
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'users'
        and column_name = 'agency_id'
    ) then
      execute '
        insert into public.users (id, email, role, agency_id)
        values ($1, $2, $3, $4)
        on conflict (id) do update
        set email = excluded.email,
            role = excluded.role,
            agency_id = excluded.agency_id,
            updated_at = now()
      '
      using target_user_id, target_email, target_role, target_agency_id;
    else
      execute '
        insert into public.users (id, email, role)
        values ($1, $2, $3)
        on conflict (id) do update
        set email = excluded.email,
            role = excluded.role,
            updated_at = now()
      '
      using target_user_id, target_email, target_role;
    end if;
  end if;

  if to_regclass('public.profiles') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'agency_id'
    ) then
      execute '
        insert into public.profiles (id, email, full_name, role, agency_id)
        values ($1, $2, $2, $3, $4)
        on conflict (id) do update
        set email = excluded.email,
            full_name = coalesce(public.profiles.full_name, excluded.full_name),
            role = excluded.role,
            agency_id = excluded.agency_id,
            updated_at = now()
      '
      using target_user_id, target_email, target_role, target_agency_id;
    else
      execute '
        insert into public.profiles (id, email, full_name, role)
        values ($1, $2, $2, $3)
        on conflict (id) do update
        set email = excluded.email,
            full_name = coalesce(public.profiles.full_name, excluded.full_name),
            role = excluded.role,
            updated_at = now()
      '
      using target_user_id, target_email, target_role;
    end if;
  end if;
end;
$$;
