-- Adjust audit and project activity security policies to support admin/auditing flows.

-- Keep the existing function identity because RLS policies depend on it.
-- CREATE OR REPLACE updates the implementation without dropping dependants.
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

-- Policies below depend on this helper, so define it before creating them.
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
