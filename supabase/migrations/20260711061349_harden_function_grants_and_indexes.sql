-- Remove default RPC exposure from SECURITY DEFINER helpers. The access
-- helpers remain executable by authenticated users because RLS policies call
-- them, but anonymous callers must never invoke them directly.
revoke execute on function public.can_access_approved_dataset(uuid, text) from public, anon;
revoke execute on function public.can_access_extraction_result(uuid, text) from public, anon;
revoke execute on function public.can_access_extraction_result_item(uuid, text) from public, anon;
revoke execute on function public.can_access_project_file(uuid, text) from public, anon;
revoke execute on function public.can_access_result_item(uuid, text) from public, anon;
revoke execute on function public.is_admin_user() from public, anon;
revoke execute on function public.is_conversation_member(uuid, text) from public, anon;
revoke execute on function public.is_feature_update_target_recipient(uuid, text) from public, anon;
revoke execute on function public.is_message_in_member_conversation(uuid, text) from public, anon;
revoke execute on function public.is_project_member(uuid, text) from public, anon;

-- Lifecycle RPCs are service-role-only because they can export or delete all
-- records associated with an arbitrary ChemVault user identifier.
revoke execute on function public.export_user_lifecycle_data(text) from public, anon, authenticated;
revoke execute on function public.delete_user_lifecycle_data(text) from public, anon, authenticated;
grant execute on function public.export_user_lifecycle_data(text) to service_role;
grant execute on function public.delete_user_lifecycle_data(text) to service_role;

-- This platform helper is not an application RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Pin lookup paths for functions reported by the database advisor.
alter function public.set_updated_at() set search_path = public;
alter function public.jsonb_text_array_contains(jsonb, text, text) set search_path = public;
alter function public.current_user_id_text() set search_path = public, auth;

-- Cover foreign keys used by lifecycle deletes and webhook log cleanup.
create index if not exists approved_datasets_result_id_idx
  on public.approved_datasets(result_id);
create index if not exists webhook_event_logs_webhook_event_id_idx
  on public.webhook_event_logs(webhook_event_id);
