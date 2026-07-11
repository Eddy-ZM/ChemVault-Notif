create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- These functions are implementation details for RLS policies. Keeping them
-- outside the exposed public schema prevents direct PostgREST RPC access while
-- preserving their policy dependencies and function identities.
alter function public.can_access_approved_dataset(uuid, text) set schema private;
alter function public.can_access_extraction_result(uuid, text) set schema private;
alter function public.can_access_extraction_result_item(uuid, text) set schema private;
alter function public.can_access_project_file(uuid, text) set schema private;
alter function public.can_access_result_item(uuid, text) set schema private;
alter function public.is_admin_user() set schema private;
alter function public.is_conversation_member(uuid, text) set schema private;
alter function public.is_feature_update_target_recipient(uuid, text) set schema private;
alter function public.is_message_in_member_conversation(uuid, text) set schema private;
alter function public.is_project_member(uuid, text) set schema private;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- Table privileges already make these surfaces read-only or service-only.
-- Removing FOR ALL deny policies avoids redundant SELECT policy evaluation.
drop policy if exists feature_updates_no_client_write on public.feature_updates;
drop policy if exists feature_update_targets_no_client_write on public.feature_update_targets;
