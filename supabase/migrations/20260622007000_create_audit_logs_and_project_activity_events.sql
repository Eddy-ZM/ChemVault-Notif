create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_type text not null default 'user',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  project_id uuid,
  user_id uuid,
  source text,
  severity text not null default 'info',
  visibility text not null default 'admin',
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank_check check (length(btrim(action)) > 0),
  constraint audit_logs_entity_type_not_blank_check check (length(btrim(entity_type)) > 0),
  constraint audit_logs_actor_type_check check (
    actor_type in ('user', 'admin', 'system', 'ai', 'service', 'webhook')
  ),
  constraint audit_logs_severity_check check (
    severity in ('debug', 'info', 'success', 'warning', 'error', 'critical')
  ),
  constraint audit_logs_visibility_check check (
    visibility in ('admin', 'project', 'private')
  )
);

create table if not exists public.project_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  actor_user_id uuid,
  actor_type text not null default 'user',
  event_type text not null,
  entity_type text,
  entity_id uuid,
  title text not null,
  description text,
  visibility text not null default 'project',
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_activity_events_project_id_not_blank_check check (project_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  constraint project_activity_events_title_not_blank_check check (length(btrim(title)) > 0),
  constraint project_activity_events_event_type_not_blank_check check (length(btrim(event_type)) > 0),
  constraint project_activity_events_actor_type_check check (
    actor_type in ('user', 'admin', 'system', 'ai', 'service', 'webhook')
  ),
  constraint project_activity_events_severity_check check (
    severity in ('debug', 'info', 'success', 'warning', 'error', 'critical')
  ),
  constraint project_activity_events_visibility_check check (
    visibility in ('admin', 'project', 'private')
  )
);

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

create index if not exists audit_logs_entity_type_idx
  on public.audit_logs (entity_type);

create index if not exists audit_logs_entity_id_idx
  on public.audit_logs (entity_id);

create index if not exists audit_logs_project_id_idx
  on public.audit_logs (project_id);

create index if not exists audit_logs_user_id_idx
  on public.audit_logs (user_id);

create index if not exists audit_logs_source_idx
  on public.audit_logs (source);

create index if not exists audit_logs_severity_idx
  on public.audit_logs (severity);

create index if not exists audit_logs_visibility_idx
  on public.audit_logs (visibility);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists project_activity_events_project_id_idx
  on public.project_activity_events (project_id);

create index if not exists project_activity_events_actor_user_id_idx
  on public.project_activity_events (actor_user_id);

create index if not exists project_activity_events_event_type_idx
  on public.project_activity_events (event_type);

create index if not exists project_activity_events_entity_type_idx
  on public.project_activity_events (entity_type);

create index if not exists project_activity_events_entity_id_idx
  on public.project_activity_events (entity_id);

create index if not exists project_activity_events_severity_idx
  on public.project_activity_events (severity);

create index if not exists project_activity_events_visibility_idx
  on public.project_activity_events (visibility);

create index if not exists project_activity_events_created_at_idx
  on public.project_activity_events (created_at desc);

create or replace function public.is_project_member(
  project_id uuid,
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
    from public.conversations c
    join public.conversation_members cm
      on cm.conversation_id = c.id
    where c.type = 'project'
      and c.project_id = $1
      and cm.user_id = $2
  );
$$;

revoke all on function public.is_project_member(uuid, uuid) from public;
grant execute on function public.is_project_member(uuid, uuid) to authenticated;

alter table public.audit_logs enable row level security;
alter table public.project_activity_events enable row level security;

revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.project_activity_events from anon, authenticated;

drop policy if exists audit_logs_admin_only on public.audit_logs;
create policy audit_logs_admin_only
  on public.audit_logs
  for select
  to authenticated
  using (false);

drop policy if exists project_activity_events_select_project_members on public.project_activity_events;
create policy project_activity_events_select_project_members
  on public.project_activity_events
  for select
  to authenticated
  using (
    visibility = 'project'
    and project_id is not null
    and public.is_project_member(project_id, (select auth.uid()))
  );

-- Realtime stream for project activity timeline.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'project_activity_events'
    )
  then
    alter publication supabase_realtime add table public.project_activity_events;
  end if;
end$$;
