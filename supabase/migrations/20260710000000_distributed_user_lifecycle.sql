create or replace function public.export_user_lifecycle_data(subject_user_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'notifications', coalesce((select jsonb_agg(to_jsonb(row)) from public.notifications row where row.user_id = subject_user_id), '[]'::jsonb),
    'notificationEvents', coalesce((select jsonb_agg(to_jsonb(row)) from public.notification_events row where row.user_id = subject_user_id), '[]'::jsonb),
    'extractionTasks', coalesce((select jsonb_agg(to_jsonb(row)) from public.extraction_tasks row where row.user_id = subject_user_id), '[]'::jsonb),
    'pushSubscriptions', coalesce((select jsonb_agg(to_jsonb(row)) from public.push_subscriptions row where row.user_id = subject_user_id), '[]'::jsonb),
    'conversationMemberships', coalesce((select jsonb_agg(to_jsonb(row)) from public.conversation_members row where row.user_id = subject_user_id), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(row)) from public.messages row where row.sender_id = subject_user_id), '[]'::jsonb),
    'messageReads', coalesce((select jsonb_agg(to_jsonb(row)) from public.message_reads row where row.user_id = subject_user_id), '[]'::jsonb),
    'serviceApiKeys', coalesce((select jsonb_agg(to_jsonb(row) - 'key_hash') from public.service_api_keys row where row.created_by = subject_user_id), '[]'::jsonb),
    'webhookEvents', coalesce((select jsonb_agg(to_jsonb(row)) from public.webhook_events row where row.user_id = subject_user_id), '[]'::jsonb),
    'preferences', coalesce((select jsonb_agg(to_jsonb(row)) from public.user_notification_preferences row where row.user_id = subject_user_id), '[]'::jsonb),
    'segments', coalesce((select jsonb_agg(to_jsonb(row)) from public.user_segments row where row.created_by = subject_user_id), '[]'::jsonb),
    'segmentMemberships', coalesce((select jsonb_agg(to_jsonb(row)) from public.user_segment_members row where row.user_id = subject_user_id or row.added_by = subject_user_id), '[]'::jsonb),
    'broadcasts', coalesce((select jsonb_agg(to_jsonb(row)) from public.broadcasts row where row.created_by = subject_user_id or row.sent_by = subject_user_id), '[]'::jsonb),
    'broadcastRecipients', coalesce((select jsonb_agg(to_jsonb(row)) from public.broadcast_recipients row where row.user_id = subject_user_id), '[]'::jsonb),
    'auditLogs', coalesce((select jsonb_agg(to_jsonb(row)) from public.audit_logs row where row.actor_user_id = subject_user_id or row.user_id = subject_user_id), '[]'::jsonb),
    'projectActivity', coalesce((select jsonb_agg(to_jsonb(row)) from public.project_activity_events row where row.actor_user_id = subject_user_id), '[]'::jsonb),
    'projectFiles', coalesce((select jsonb_agg(to_jsonb(row)) from public.project_files row where row.user_id = subject_user_id), '[]'::jsonb),
    'fileEvents', coalesce((select jsonb_agg(to_jsonb(row)) from public.file_events row where row.user_id = subject_user_id), '[]'::jsonb),
    'extractionResults', coalesce((select jsonb_agg(to_jsonb(row)) from public.extraction_results row where row.user_id = subject_user_id), '[]'::jsonb),
    'extractionResultItems', coalesce((select jsonb_agg(to_jsonb(row)) from public.extraction_result_items row where row.result_id in (select id from public.extraction_results where user_id = subject_user_id) or row.reviewed_by = subject_user_id), '[]'::jsonb),
    'extractionResultReviews', coalesce((select jsonb_agg(to_jsonb(row)) from public.extraction_result_reviews row where row.result_id in (select id from public.extraction_results where user_id = subject_user_id) or row.reviewer_id = subject_user_id), '[]'::jsonb),
    'extractionResultExports', coalesce((select jsonb_agg(to_jsonb(row)) from public.extraction_result_exports row where row.user_id = subject_user_id), '[]'::jsonb),
    'resultReviews', coalesce((select jsonb_agg(to_jsonb(row)) from public.result_reviews row where row.result_id in (select id from public.extraction_results where user_id = subject_user_id) or row.reviewer_id = subject_user_id), '[]'::jsonb),
    'resultCorrections', coalesce((select jsonb_agg(to_jsonb(row)) from public.result_corrections row where row.result_id in (select id from public.extraction_results where user_id = subject_user_id) or row.corrected_by = subject_user_id), '[]'::jsonb),
    'approvedDatasets', coalesce((select jsonb_agg(to_jsonb(row)) from public.approved_datasets row where row.user_id = subject_user_id), '[]'::jsonb),
    'featureUpdates', coalesce((select jsonb_agg(to_jsonb(row)) from public.feature_updates row where row.created_by = subject_user_id or row.updated_by = subject_user_id), '[]'::jsonb),
    'featureUpdateReads', coalesce((select jsonb_agg(to_jsonb(row)) from public.feature_update_reads row where row.user_id = subject_user_id), '[]'::jsonb),
    'featureUpdateReactions', coalesce((select jsonb_agg(to_jsonb(row)) from public.feature_update_reactions row where row.user_id = subject_user_id), '[]'::jsonb),
    'featureUpdateFeedback', coalesce((select jsonb_agg(to_jsonb(row)) from public.feature_update_feedback row where row.user_id = subject_user_id), '[]'::jsonb)
  );
$$;

create or replace function public.delete_user_lifecycle_data(subject_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
  changed integer := 0;
begin
  delete from public.feature_update_feedback where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.feature_update_reactions where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.feature_update_reads where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  update public.feature_updates set created_by = null where created_by = subject_user_id;
  update public.feature_updates set updated_by = null where updated_by = subject_user_id;
  update public.feature_update_targets target
    set target_payload = jsonb_set(
      target.target_payload,
      '{userIds}',
      coalesce((select jsonb_agg(value) from jsonb_array_elements_text(target.target_payload -> 'userIds') value where value <> subject_user_id), '[]'::jsonb)
    )
    where jsonb_typeof(target.target_payload -> 'userIds') = 'array';

  delete from public.result_corrections where corrected_by = subject_user_id and result_id not in (select id from public.extraction_results where user_id = subject_user_id); get diagnostics changed = row_count; affected := affected + changed;
  delete from public.result_reviews where reviewer_id = subject_user_id and result_id not in (select id from public.extraction_results where user_id = subject_user_id); get diagnostics changed = row_count; affected := affected + changed;
  delete from public.extraction_result_reviews where reviewer_id = subject_user_id and result_id not in (select id from public.extraction_results where user_id = subject_user_id); get diagnostics changed = row_count; affected := affected + changed;
  delete from public.extraction_result_exports where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.approved_datasets where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.extraction_results where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.extraction_tasks where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;

  delete from public.file_events where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.project_files where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.project_activity_events where actor_user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.audit_logs where actor_user_id = subject_user_id or user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  update public.broadcast_audit_logs set actor_id = null where actor_id = subject_user_id;
  delete from public.broadcast_recipients where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  update public.broadcasts set created_by = null where created_by = subject_user_id;
  update public.broadcasts set sent_by = null where sent_by = subject_user_id;
  delete from public.user_segment_members where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  update public.user_segment_members set added_by = null where added_by = subject_user_id;
  update public.user_segments set created_by = null where created_by = subject_user_id;
  delete from public.user_notification_preferences where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.webhook_events where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.service_api_keys where created_by = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.message_reads where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.conversation_members where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  update public.messages set sender_id = null where sender_id = subject_user_id;
  delete from public.push_subscriptions where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.notification_events where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;
  delete from public.notifications where user_id = subject_user_id; get diagnostics changed = row_count; affected := affected + changed;

  return jsonb_build_object('recordsDeleted', affected, 'completed', true);
end;
$$;

revoke all on function public.export_user_lifecycle_data(text) from public;
revoke all on function public.delete_user_lifecycle_data(text) from public;
grant execute on function public.export_user_lifecycle_data(text) to service_role;
grant execute on function public.delete_user_lifecycle_data(text) to service_role;
