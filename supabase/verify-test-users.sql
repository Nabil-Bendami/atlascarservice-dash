select
  auth_users.id,
  auth_users.email,
  auth_users.email_confirmed_at is not null as email_confirmed,
  auth_users.raw_user_meta_data ->> 'role' as auth_metadata_role,
  public_users.role as public_users_role,
  profiles.role as profiles_role,
  coalesce(public_users.role, profiles.role, auth_users.raw_user_meta_data ->> 'role') as effective_role
from auth.users auth_users
left join public.users public_users on public_users.id = auth_users.id
left join public.profiles profiles on profiles.id = auth_users.id
where auth_users.email in (
  'owner123@test.com',
  'agency123@test.com',
  'client123@test.com'
)
order by auth_users.email;

select
  auth_users.email,
  coalesce(public_users.role, profiles.role, auth_users.raw_user_meta_data ->> 'role') as effective_role,
  case
    when auth_users.email = 'owner123@test.com'
      and coalesce(public_users.role, profiles.role, auth_users.raw_user_meta_data ->> 'role') = 'super_owner'
      then 'can access Owner Dashboard'
    when auth_users.email = 'agency123@test.com'
      and coalesce(public_users.role, profiles.role, auth_users.raw_user_meta_data ->> 'role') = 'agency'
      then 'can access Agency Dashboard only'
    when auth_users.email = 'client123@test.com'
      and coalesce(public_users.role, profiles.role, auth_users.raw_user_meta_data ->> 'role') = 'client'
      then 'can access client features only'
    else 'role mismatch'
  end as expected_access
from auth.users auth_users
left join public.users public_users on public_users.id = auth_users.id
left join public.profiles profiles on profiles.id = auth_users.id
where auth_users.email in (
  'owner123@test.com',
  'agency123@test.com',
  'client123@test.com'
)
order by auth_users.email;
