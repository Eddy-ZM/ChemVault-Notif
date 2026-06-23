-- Harden audit and project activity RLS after the initial audit schema migration.
-- Server-side application code writes through the service role client; client
-- inserts remain blocked by table privileges and insert policies.

create or replace function public.is_admin_user()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  jwt_email text;
  jwt_role text;
  configured_emails text[];
begin
  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  jwt_role := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''));
  configured_emails := string_to_array(
    lower(coalesce(current_setting('app.admin_emails', true), '')),
    ','
  );

  if jwt_role = 'admin' then
    return true;
  end if;

  if jwt_email <> '' and jwt_email = any(configured_emails) then
    return true;
  end if;

  return exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and (
        lower(coalesce(u.raw_app_meta_data ->> 'role', '')) = 'admin'
        or lower(coalesce(u.email, '')) = any(configured_emails)
      )
  );
exception
  when others then
    return false;
end;
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;

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
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
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
grant select on table public.audit_logs to authenticated;
grant select on table public.project_activity_events to authenticated;

drop policy if exists audit_logs_admin_only on public.audit_logs;
drop policy if exists audit_logs_admin_or_service on public.audit_logs;
drop policy if exists audit_logs_insert_service on public.audit_logs;

create policy audit_logs_admin_select
  on public.audit_logs
  for select
  to authenticated
  using ((select public.is_admin_user()));

create policy audit_logs_no_client_insert
  on public.audit_logs
  for insert
  to authenticated
  with check (false);

drop policy if exists project_activity_events_select_project_members
  on public.project_activity_events;
drop policy if exists project_activity_events_select_policy
  on public.project_activity_events;
drop policy if exists project_activity_events_insert_service
  on public.project_activity_events;

create policy project_activity_events_select_policy
  on public.project_activity_events
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or (
      visibility = 'project'
      and (select public.is_project_member(project_id, (select auth.uid())))
    )
  );

create policy project_activity_events_no_client_insert
  on public.project_activity_events
  for insert
  to authenticated
  with check (false);
