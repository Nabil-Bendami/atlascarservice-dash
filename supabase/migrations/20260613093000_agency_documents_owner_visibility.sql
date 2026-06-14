-- Align Owner Dashboard with the agency document upload contract used by the
-- agency app. This is additive: no existing document data or upload behavior is
-- changed.

do $$
declare
  v_relkind "char";
begin
  select c.relkind
  into v_relkind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'agency_documents';

  if v_relkind is null then
    raise exception 'public.agency_documents does not exist';
  end if;

  if v_relkind not in ('r', 'p') then
    raise exception 'public.agency_documents must be a table, found relkind %', v_relkind;
  end if;
end $$;

alter table public.agency_documents
  add column if not exists document_name text,
  add column if not exists file_name text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists uploaded_at timestamptz;

update public.agency_documents
set
  document_name = coalesce(document_name, file_name, document_type, 'Document'),
  file_name = coalesce(file_name, nullif(regexp_replace(coalesce(file_url, ''), '^.*/', ''), ''), document_type, 'Document'),
  uploaded_at = coalesce(uploaded_at, created_at, now())
where document_name is null
   or file_name is null
   or uploaded_at is null;

create index if not exists idx_agency_documents_agency_uploaded
  on public.agency_documents (agency_id, uploaded_at desc);

insert into storage.buckets (id, name, public)
values ('agency-documents', 'agency-documents', false)
on conflict (id) do update set public = false;

alter table public.agency_documents enable row level security;

-- Pure read-only helpers for agency_documents RLS. These deliberately avoid
-- get_current_profile(), current_role(), current_agency_id(), is_super_owner(),
-- and can_access_agency(), because some deployments redefine those helpers to
-- self-heal identity rows with INSERT/UPDATE statements.
create or replace function public.agency_documents_is_super_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_owner'
  )
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'super_owner'
  )
$$;

create or replace function public.agency_documents_is_agency_member(target_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'agency'
      and p.agency_id = target_agency_id
  )
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'agency'
      and u.agency_id = target_agency_id
  )
$$;

create or replace function public.agency_documents_is_owner(target_agency_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_allowed boolean := false;
begin
  if auth.uid() is null or target_agency_id is null then
    return false;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agencies'
      and column_name = 'owner_user_id'
  ) then
    execute 'select exists (select 1 from public.agencies where id = $1 and owner_user_id = $2)'
      into v_allowed
      using target_agency_id, auth.uid();
    if v_allowed then
      return true;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agencies'
      and column_name = 'owner_id'
  ) then
    execute 'select exists (select 1 from public.agencies where id = $1 and owner_id = $2)'
      into v_allowed
      using target_agency_id, auth.uid();
    if v_allowed then
      return true;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agencies'
      and column_name = 'user_id'
  ) then
    execute 'select exists (select 1 from public.agencies where id = $1 and user_id = $2)'
      into v_allowed
      using target_agency_id, auth.uid();
    if v_allowed then
      return true;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agencies'
      and column_name = 'owner_profile_id'
  ) then
    execute 'select exists (select 1 from public.agencies where id = $1 and owner_profile_id = $2)'
      into v_allowed
      using target_agency_id, auth.uid();
    if v_allowed then
      return true;
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.agency_documents_path_agency_id(object_name text)
returns uuid
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (storage.foldername(object_name))[1]::uuid
    else null
  end
$$;

-- Drop legacy policies that call public.can_access_agency(), public.is_super_owner(),
-- public.current_role(), or public.current_agency_id(). Those helpers can route
-- through resolve_profile_identity(), which writes profiles/users and fails during
-- PostgREST read-only GET transactions.
drop policy if exists agency_documents_super_owner_all on public.agency_documents;
drop policy if exists agency_documents_agency_manage_own on public.agency_documents;
drop policy if exists agency_documents_super_owner_select on public.agency_documents;
drop policy if exists agency_documents_agency_select_own on public.agency_documents;
drop policy if exists agency_documents_agency_insert_own on public.agency_documents;
drop policy if exists agency_documents_agency_delete_own on public.agency_documents;
drop policy if exists agency_documents_owner_select on public.agency_documents;

create policy agency_documents_super_owner_select
on public.agency_documents
for select
to authenticated
using (public.agency_documents_is_super_owner());

create policy agency_documents_agency_select_own
on public.agency_documents
for select
to authenticated
using (public.agency_documents_is_agency_member(agency_id));

create policy agency_documents_agency_insert_own
on public.agency_documents
for insert
to authenticated
with check (public.agency_documents_is_agency_member(agency_id));

create policy agency_documents_agency_delete_own
on public.agency_documents
for delete
to authenticated
using (public.agency_documents_is_agency_member(agency_id));

create policy agency_documents_owner_select
on public.agency_documents
for select
to authenticated
using (public.agency_documents_is_owner(agency_id));

drop policy if exists agency_documents_agency_read on storage.objects;
drop policy if exists agency_documents_agency_write on storage.objects;
drop policy if exists agency_documents_agency_update on storage.objects;
drop policy if exists agency_documents_agency_delete on storage.objects;
drop policy if exists agency_documents_owner_storage_read on storage.objects;
drop policy if exists agency_documents_storage_select on storage.objects;
drop policy if exists agency_documents_storage_insert on storage.objects;
drop policy if exists agency_documents_storage_delete on storage.objects;
create policy agency_documents_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'agency-documents'
  and (
    public.agency_documents_is_super_owner()
    or public.agency_documents_is_agency_member(public.agency_documents_path_agency_id(name))
    or public.agency_documents_is_owner(public.agency_documents_path_agency_id(name))
  )
);

create policy agency_documents_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'agency-documents'
  and public.agency_documents_is_agency_member(public.agency_documents_path_agency_id(name))
);

create policy agency_documents_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'agency-documents'
  and public.agency_documents_is_agency_member(public.agency_documents_path_agency_id(name))
);
