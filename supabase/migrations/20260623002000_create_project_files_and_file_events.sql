create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_id uuid not null,
  storage_bucket text not null,
  storage_path text not null,
  original_file_name text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  file_hash text,
  status text not null default 'uploaded',
  processing_status text not null default 'none',
  extraction_task_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_files_storage_bucket_not_blank_check check (length(btrim(storage_bucket)) > 0),
  constraint project_files_storage_path_not_blank_check check (length(btrim(storage_path)) > 0),
  constraint project_files_original_file_name_not_blank_check check (length(btrim(original_file_name)) > 0),
  constraint project_files_file_name_not_blank_check check (length(btrim(file_name)) > 0),
  constraint project_files_file_size_check check (file_size is null or file_size >= 0),
  constraint project_files_status_check check (
    status in ('uploaded', 'processing', 'ready', 'failed', 'deleted', 'archived')
  ),
  constraint project_files_processing_status_check check (
    processing_status in ('none', 'queued', 'parsing', 'extracting', 'validating', 'completed', 'failed')
  )
);

create table if not exists public.file_events (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.project_files(id) on delete cascade,
  project_id uuid,
  user_id uuid,
  event_type text not null,
  title text not null,
  description text,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint file_events_event_type_check check (
    event_type in (
      'file.uploaded',
      'file.processing_queued',
      'file.processing_started',
      'file.parsing_started',
      'file.extraction_started',
      'file.validation_started',
      'file.processing_completed',
      'file.processing_failed',
      'file.deleted',
      'file.archived',
      'file.permission_changed'
    )
  ),
  constraint file_events_severity_check check (
    severity in ('debug', 'info', 'success', 'warning', 'error', 'critical')
  ),
  constraint file_events_title_not_blank_check check (length(btrim(title)) > 0)
);

create index if not exists project_files_project_id_idx
  on public.project_files (project_id);

create index if not exists project_files_user_id_idx
  on public.project_files (user_id);

create index if not exists project_files_status_idx
  on public.project_files (status);

create index if not exists project_files_processing_status_idx
  on public.project_files (processing_status);

create index if not exists project_files_extraction_task_id_idx
  on public.project_files (extraction_task_id);

create index if not exists project_files_created_at_idx
  on public.project_files (created_at desc);

create index if not exists file_events_file_id_idx
  on public.file_events (file_id);

create index if not exists file_events_project_id_idx
  on public.file_events (project_id);

create index if not exists file_events_user_id_idx
  on public.file_events (user_id);

create index if not exists file_events_event_type_idx
  on public.file_events (event_type);

create index if not exists file_events_created_at_idx
  on public.file_events (created_at desc);

drop trigger if exists set_project_files_updated_at on public.project_files;
create trigger set_project_files_updated_at
  before update on public.project_files
  for each row
  execute function public.set_updated_at();

create or replace function public.can_access_project_file(
  file_id uuid,
  member_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_files pf
    where pf.id = $1
      and (
        pf.user_id = $2
        or (
          pf.project_id is not null
          and public.is_project_member(pf.project_id, $2)
        )
      )
  );
$$;

revoke all on function public.can_access_project_file(uuid, uuid) from public;
grant execute on function public.can_access_project_file(uuid, uuid) to authenticated;

alter table public.project_files enable row level security;
alter table public.file_events enable row level security;

revoke all on table public.project_files from anon, authenticated;
revoke all on table public.file_events from anon, authenticated;

grant select on table public.project_files to authenticated;
grant select on table public.file_events to authenticated;

drop policy if exists project_files_select_accessible on public.project_files;
create policy project_files_select_accessible
  on public.project_files
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select auth.uid())
    or (
      project_id is not null
      and (select public.is_project_member(project_id, (select auth.uid())))
    )
  );

drop policy if exists project_files_no_client_insert on public.project_files;
create policy project_files_no_client_insert
  on public.project_files
  for insert
  to authenticated
  with check (false);

drop policy if exists project_files_no_client_update on public.project_files;
create policy project_files_no_client_update
  on public.project_files
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists file_events_select_accessible on public.file_events;
create policy file_events_select_accessible
  on public.file_events
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select auth.uid())
    or (
      project_id is not null
      and (select public.is_project_member(project_id, (select auth.uid())))
    )
    or (select public.can_access_project_file(file_id, (select auth.uid())))
  );

drop policy if exists file_events_no_client_insert on public.file_events;
create policy file_events_no_client_insert
  on public.file_events
  for insert
  to authenticated
  with check (false);

alter table public.project_files replica identity full;
alter table public.file_events replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'project_files'
    )
  then
    alter publication supabase_realtime add table public.project_files;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'file_events'
    )
  then
    alter publication supabase_realtime add table public.file_events;
  end if;
end $$;
