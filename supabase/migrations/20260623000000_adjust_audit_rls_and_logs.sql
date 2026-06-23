-- Adjust audit and project activity security policies to support admin/auditing flows.

-- Keep project-member helper available for project activity visibility checks.
drop function if exists public.is_project_member(uuid, uuid);
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

drop policy if exists audit_logs_admin_only on public.audit_logs;
create policy audit_logs_admin_only
  on public.audit_logs
  for select
  to authenticated
  using (false);

drop policy if exists audit_logs_admin_or_service on public.audit_logs;
create policy audit_logs_admin_or_service
  on public.audit_logs
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or actor_user_id = (select auth.uid())
    or coalesce(actor_user_id, null) is null
  );

drop policy if exists audit_logs_insert_service on public.audit_logs;
create policy audit_logs_insert_service
  on public.audit_logs
  for insert
  to authenticated
  with check (false);

drop policy if exists project_activity_events_select_policy on public.project_activity_events;
create policy project_activity_events_select_policy
  on public.project_activity_events
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or (
      visibility = 'project'
      and public.is_project_member(project_id, (select auth.uid()))
    )
    or visibility = 'private' and actor_user_id = (select auth.uid())
    or visibility = 'admin' and (select public.is_admin_user())
  );

drop policy if exists project_activity_events_insert_service on public.project_activity_events;
create policy project_activity_events_insert_service
  on public.project_activity_events
  for insert
  to authenticated
  with check (false);

-- Helper for admin checks used by policy evaluations.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'email' ilike any (
    string_to_array(current_setting('app.admin_emails', true), ',')
  );
$$;

-- Fallback for local/database usage when app.admin_emails is not set.
create or replace function public.is_admin_user()
returns boolean
language plpgsql
as $$
begin
  return exists (
    select 1
    from auth.users
    where auth.users.id = auth.uid()
      and lower(auth.users.email) = any (
        string_to_array(coalesce(current_setting('app.admin_emails', true), ''), ',')
      )
  );
exception
  when others then
    return false;
end;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
