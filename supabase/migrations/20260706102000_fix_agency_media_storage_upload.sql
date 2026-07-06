begin;

insert into storage.buckets (id, name, public)
values ('agency-media', 'agency-media', true)
on conflict (id) do update
set public = true;

create or replace function public.storage_agency_media_target_agency_id(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  folders text[];
  raw_agency_id text;
begin
  folders := storage.foldername(object_name);

  if array_length(folders, 1) is null then
    return null;
  end if;

  if folders[1] = 'agencies' then
    raw_agency_id := folders[2];
  else
    raw_agency_id := folders[1];
  end if;

  if raw_agency_id is null or raw_agency_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  return raw_agency_id::uuid;
end;
$$;

create or replace function public.can_manage_agency_media(target_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.role in ('super_owner', 'owner', 'admin')
          or p.agency_id = target_agency_id
        )
    )
    or exists (
      select 1
      from public.agencies a
      where a.id = target_agency_id
        and a.owner_user_id = auth.uid()
    ),
    false
  )
$$;

drop policy if exists agency_media_public_read on storage.objects;
create policy agency_media_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'agency-media');

drop policy if exists agency_media_agency_write on storage.objects;
create policy agency_media_agency_write
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'agency-media'
  and public.storage_agency_media_target_agency_id(name) is not null
  and public.can_manage_agency_media(public.storage_agency_media_target_agency_id(name))
);

drop policy if exists agency_media_agency_update on storage.objects;
create policy agency_media_agency_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'agency-media'
  and public.storage_agency_media_target_agency_id(name) is not null
  and public.can_manage_agency_media(public.storage_agency_media_target_agency_id(name))
)
with check (
  bucket_id = 'agency-media'
  and public.storage_agency_media_target_agency_id(name) is not null
  and public.can_manage_agency_media(public.storage_agency_media_target_agency_id(name))
);

drop policy if exists agency_media_agency_delete on storage.objects;
create policy agency_media_agency_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'agency-media'
  and public.storage_agency_media_target_agency_id(name) is not null
  and public.can_manage_agency_media(public.storage_agency_media_target_agency_id(name))
);

commit;
