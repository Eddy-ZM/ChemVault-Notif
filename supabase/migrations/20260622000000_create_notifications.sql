create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  type text not null default 'info',
  source text,
  link text,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in ('info', 'success', 'warning', 'error', 'message', 'system', 'task')
  )
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_read_created_idx
  on public.notifications (user_id, read, created_at desc);

create index if not exists notifications_user_type_created_idx
  on public.notifications (user_id, type, created_at desc);

create index if not exists notifications_user_source_created_idx
  on public.notifications (user_id, source, created_at desc)
  where source is not null;

create index if not exists notification_events_user_created_idx
  on public.notification_events (user_id, created_at desc);

create index if not exists notification_events_notification_created_idx
  on public.notification_events (notification_id, created_at desc);

alter table public.notifications enable row level security;
alter table public.notification_events enable row level security;

revoke all on table public.notifications from anon, authenticated;
revoke all on table public.notification_events from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.notifications to authenticated;
grant update (read) on table public.notifications to authenticated;
grant select on table public.notification_events to authenticated;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notifications_update_own_read on public.notifications;
create policy notifications_update_own_read
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists notification_events_select_own on public.notification_events;
create policy notification_events_select_own
  on public.notification_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.notifications replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    )
  then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
