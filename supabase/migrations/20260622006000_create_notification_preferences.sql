create table if not exists public.user_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  channel text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_notification_preferences_category_check check (
    category in (
      'task_updates',
      'task_completed',
      'task_failed',
      'project_messages',
      'admin_announcements',
      'system_alerts',
      'security',
      'billing',
      'marketing'
    )
  ),
  constraint user_notification_preferences_channel_check check (
    channel in ('in_app', 'web_push')
  ),
  constraint user_notification_preferences_user_category_channel_key unique (
    user_id,
    category,
    channel
  )
);

create table if not exists public.notification_preference_defaults (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  channel text not null,
  enabled boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  constraint notification_preference_defaults_category_check check (
    category in (
      'task_updates',
      'task_completed',
      'task_failed',
      'project_messages',
      'admin_announcements',
      'system_alerts',
      'security',
      'billing',
      'marketing'
    )
  ),
  constraint notification_preference_defaults_channel_check check (
    channel in ('in_app', 'web_push')
  ),
  constraint notification_preference_defaults_category_channel_key unique (category, channel)
);

create index if not exists user_notification_preferences_user_id_idx
  on public.user_notification_preferences (user_id);

create index if not exists user_notification_preferences_category_idx
  on public.user_notification_preferences (category);

create index if not exists user_notification_preferences_channel_idx
  on public.user_notification_preferences (channel);

create index if not exists notification_preference_defaults_category_idx
  on public.notification_preference_defaults (category);

create index if not exists notification_preference_defaults_channel_idx
  on public.notification_preference_defaults (channel);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger set_user_notification_preferences_updated_at
  before update on public.user_notification_preferences
  for each row
  execute function public.set_updated_at();

alter table public.user_notification_preferences enable row level security;
alter table public.notification_preference_defaults enable row level security;

revoke all on table public.user_notification_preferences from anon, authenticated;
revoke all on table public.notification_preference_defaults from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update on public.user_notification_preferences to authenticated;
grant select on public.notification_preference_defaults to authenticated;

drop policy if exists user_notification_preferences_select_own on public.user_notification_preferences;
create policy user_notification_preferences_select_own
  on public.user_notification_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_notification_preferences_insert_own on public.user_notification_preferences;
create policy user_notification_preferences_insert_own
  on public.user_notification_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_notification_preferences_update_own on public.user_notification_preferences;
create policy user_notification_preferences_update_own
  on public.user_notification_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Defaults are intentionally read-only from authenticated users.
drop policy if exists notification_preference_defaults_select_authenticated on public.notification_preference_defaults;
create policy notification_preference_defaults_select_authenticated
  on public.notification_preference_defaults
  for select
  to authenticated
  using (true);
