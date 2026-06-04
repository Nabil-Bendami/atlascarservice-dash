-- Replace EMAIL before running these checks.

select *
from auth.users
where email = 'EMAIL';

select *
from public.users
where email = 'EMAIL';

select *
from public.profiles
where email = 'EMAIL';

select
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data ->> 'role' as auth_metadata_role,
  pu.role as public_user_role,
  pu.agency_id as public_user_agency_id,
  pr.role as profile_role,
  pr.agency_id as profile_agency_id,
  ag.id as agency_id,
  ag.name as agency_name,
  ap.id as agency_permission_id
from auth.users au
left join public.users pu on pu.id = au.id
left join public.profiles pr on pr.id = au.id
left join public.agencies ag on ag.owner_user_id = au.id
left join public.agency_permissions ap on ap.agency_id = ag.id
where au.email = 'EMAIL';
