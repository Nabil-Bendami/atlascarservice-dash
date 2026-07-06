begin;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('super_owner', 'admin'), false);
$$;

drop policy if exists agency_media_super_owner_delete on storage.objects;
create policy agency_media_super_owner_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'agency-media' and public.is_platform_admin());

create or replace function public.owner_hard_delete_agency(p_agency_id uuid, p_reason text default null)
returns public.agencies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency public.agencies;
begin
  if not public.is_platform_admin() then
    raise exception 'Only super owners or admins can delete agencies';
  end if;

  select *
  into v_agency
  from public.agencies
  where id = p_agency_id;

  if not found then
    raise exception 'Agency not found';
  end if;

  insert into public.admin_audit_logs (
    owner_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    auth.uid(),
    'delete_agency',
    'agency',
    p_agency_id,
    jsonb_build_object(
      'reason', p_reason,
      'agency_name', v_agency.name,
      'agency_email', v_agency.email
    )
  );

  delete from public.reviews
  where agency_id = p_agency_id
     or car_id in (
       select id
       from public.cars
       where agency_id = p_agency_id
     );

  delete from public.reservations
  where agency_id = p_agency_id
     or car_id in (
       select id
       from public.cars
       where agency_id = p_agency_id
     );

  delete from public.car_images
  where car_id in (
    select id
    from public.cars
    where agency_id = p_agency_id
  );

  update public.traffic_events
  set
    agency_id = null,
    car_id = case
      when car_id in (
        select id
        from public.cars
        where agency_id = p_agency_id
      ) then null
      else car_id
    end
  where agency_id = p_agency_id
     or car_id in (
       select id
       from public.cars
       where agency_id = p_agency_id
     );

  update public.payments
  set agency_id = null
  where agency_id = p_agency_id;

  delete from public.subscriptions
  where agency_id = p_agency_id;

  delete from public.agency_documents
  where agency_id = p_agency_id;

  delete from public.agency_permissions
  where agency_id = p_agency_id;

  delete from public.agency_status_history
  where agency_id = p_agency_id;

  delete from public.cars
  where agency_id = p_agency_id;

  delete from public.agencies
  where id = p_agency_id;

  return v_agency;
end;
$$;

revoke all on function public.owner_hard_delete_agency(uuid, text) from public;
grant execute on function public.owner_hard_delete_agency(uuid, text) to authenticated;

commit;
