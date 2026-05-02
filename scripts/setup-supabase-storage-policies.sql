-- Run in Supabase SQL Editor (Dashboard -> SQL -> New Query)
-- Purpose: allow authenticated PestTrace users to upload/view certification files
-- Bucket used by app: logbook-photos

-- 1) Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('logbook-photos', 'logbook-photos', false)
on conflict (id) do nothing;

-- 2) Create policies only if they do not already exist.
-- NOTE:
-- - We intentionally do NOT run ALTER TABLE storage.objects here because some
--   Supabase roles are not table owners and will fail with "must be owner".
-- - We also do not drop existing policies for the same reason.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pesttrace_logbook_authenticated_select'
  ) then
    create policy "pesttrace_logbook_authenticated_select"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'logbook-photos');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pesttrace_logbook_authenticated_insert'
  ) then
    create policy "pesttrace_logbook_authenticated_insert"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'logbook-photos');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pesttrace_logbook_authenticated_update'
  ) then
    create policy "pesttrace_logbook_authenticated_update"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'logbook-photos')
    with check (bucket_id = 'logbook-photos');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pesttrace_logbook_authenticated_delete'
  ) then
    create policy "pesttrace_logbook_authenticated_delete"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'logbook-photos');
  end if;
end
$$;

