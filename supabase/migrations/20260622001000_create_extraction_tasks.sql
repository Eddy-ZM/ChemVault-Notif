create table if not exists public.extraction_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid,
  file_id uuid,
  file_name text,
  status text not null default 'uploaded',
  progress integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extraction_tasks_status_check check (
    status in (
      'uploaded',
      'queued',
      'processing',
      'extracting',
      'validating',
      'completed',
      'failed'
    )
  ),
  constraint extraction_tasks_progress_check check (
    progress >= 0 and progress <= 100
  )
);

create index if not exists extraction_tasks_user_created_idx
  on public.extraction_tasks (user_id, created_at desc);

create index if not exists extraction_tasks_user_project_created_idx
  on public.extraction_tasks (user_id, project_id, created_at desc);

create index if not exists extraction_tasks_user_status_created_idx
  on public.extraction_tasks (user_id, status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_extraction_tasks_updated_at on public.extraction_tasks;
create trigger set_extraction_tasks_updated_at
  before update on public.extraction_tasks
  for each row
  execute function public.set_updated_at();

alter table public.extraction_tasks enable row level security;

revoke all on table public.extraction_tasks from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.extraction_tasks to authenticated;

drop policy if exists extraction_tasks_select_own on public.extraction_tasks;
create policy extraction_tasks_select_own
  on public.extraction_tasks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
