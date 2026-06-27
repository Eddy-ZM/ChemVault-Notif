-- Integrate ChemVault Notification Center with ChemVault User Center.
--
-- User Center ids are stable text ids such as usr_..., while early
-- Notification Center migrations used Supabase Auth uuid ids. Store identity
-- references as text so both systems can address the same notification,
-- messaging, file, activity, result, and changelog records.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'notifications',
        'notification_events',
        'extraction_tasks',
        'push_subscriptions',
        'conversations',
        'conversation_members',
        'messages',
        'message_reads',
        'user_notification_preferences',
        'notification_preference_defaults',
        'audit_logs',
        'project_activity_events',
        'project_files',
        'file_events',
        'extraction_results',
        'extraction_result_items',
        'extraction_result_reviews',
        'extraction_result_exports',
        'result_items',
        'result_reviews',
        'result_corrections',
        'approved_datasets',
        'feature_updates',
        'feature_update_targets',
        'feature_update_reads',
        'feature_update_reactions',
        'feature_update_feedback'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

drop function if exists public.is_feature_update_target_recipient(uuid, uuid) cascade;
drop function if exists public.can_access_approved_dataset(uuid, uuid) cascade;
drop function if exists public.can_access_result_item(uuid, uuid) cascade;
drop function if exists public.can_access_extraction_result_item(uuid, uuid) cascade;
drop function if exists public.can_access_extraction_result(uuid, uuid) cascade;
drop function if exists public.can_access_project_file(uuid, uuid) cascade;
drop function if exists public.is_project_member(uuid, uuid) cascade;
drop function if exists public.is_message_in_member_conversation(uuid, uuid) cascade;
drop function if exists public.is_conversation_member(uuid, uuid) cascade;

do $$
declare
  column_spec text[];
  column_specs text[][] := array[
    array['notifications', 'user_id'],
    array['notification_events', 'user_id'],
    array['extraction_tasks', 'user_id'],
    array['push_subscriptions', 'user_id'],
    array['conversation_members', 'user_id'],
    array['messages', 'sender_id'],
    array['message_reads', 'user_id'],
    array['service_api_keys', 'created_by'],
    array['webhook_events', 'user_id'],
    array['user_notification_preferences', 'user_id'],
    array['user_segments', 'created_by'],
    array['user_segment_members', 'user_id'],
    array['user_segment_members', 'added_by'],
    array['broadcasts', 'created_by'],
    array['broadcasts', 'sent_by'],
    array['broadcast_recipients', 'user_id'],
    array['broadcast_audit_logs', 'actor_id'],
    array['audit_logs', 'actor_user_id'],
    array['audit_logs', 'user_id'],
    array['project_activity_events', 'actor_user_id'],
    array['project_files', 'user_id'],
    array['file_events', 'user_id'],
    array['extraction_results', 'user_id'],
    array['extraction_results', 'reviewed_by'],
    array['extraction_results', 'approved_by'],
    array['extraction_results', 'rejected_by'],
    array['extraction_result_items', 'reviewed_by'],
    array['extraction_result_reviews', 'reviewer_id'],
    array['extraction_result_exports', 'user_id'],
    array['result_reviews', 'reviewer_id'],
    array['result_corrections', 'corrected_by'],
    array['approved_datasets', 'user_id'],
    array['feature_updates', 'created_by'],
    array['feature_updates', 'updated_by'],
    array['feature_update_reads', 'user_id'],
    array['feature_update_reactions', 'user_id'],
    array['feature_update_feedback', 'user_id']
  ];
begin
  foreach column_spec slice 1 in array column_specs
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = column_spec[1]
        and column_name = column_spec[2]
        and data_type <> 'text'
    ) then
      execute format(
        'alter table public.%I alter column %I type text using %I::text',
        column_spec[1],
        column_spec[2],
        column_spec[2]
      );
    end if;
  end loop;
end $$;

create or replace function public.current_user_id_text()
returns text
language sql
stable
as $$
  select (select auth.uid())::text;
$$;

revoke all on function public.current_user_id_text() from public;
grant execute on function public.current_user_id_text() to authenticated;

create or replace function public.is_conversation_member(
  conversation_id uuid,
  member_user_id text
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
    where cm.conversation_id = $1
      and cm.user_id = $2
  );
$$;

create or replace function public.is_message_in_member_conversation(
  message_id uuid,
  member_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    join public.conversation_members cm
      on cm.conversation_id = m.conversation_id
    where m.id = $1
      and cm.user_id = $2
  );
$$;

create or replace function public.is_project_member(
  project_id uuid,
  member_user_id text
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

create or replace function public.can_access_project_file(
  file_id uuid,
  member_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_files pf
    where pf.id = $1
      and (
        pf.user_id = $2
        or (
          pf.project_id is not null
          and public.is_project_member(pf.project_id, $2)
        )
      )
  );
$$;

create or replace function public.can_access_extraction_result(
  result_id uuid,
  member_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.extraction_results er
    where er.id = $1
      and (
        er.user_id = $2
        or (
          er.project_id is not null
          and public.is_project_member(er.project_id, $2)
        )
      )
  );
$$;

create or replace function public.can_access_extraction_result_item(
  item_id uuid,
  member_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.extraction_result_items eri
    where eri.id = $1
      and public.can_access_extraction_result(eri.result_id, $2)
  );
$$;

create or replace function public.can_access_result_item(
  item_id uuid,
  member_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.result_items ri
    where ri.id = $1
      and public.can_access_extraction_result(ri.result_id, $2)
  );
$$;

create or replace function public.can_access_approved_dataset(
  dataset_id uuid,
  member_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.approved_datasets ad
    where ad.id = $1
      and (
        ad.user_id = $2
        or (
          ad.project_id is not null
          and public.is_project_member(ad.project_id, $2)
        )
        or (
          ad.result_id is not null
          and public.can_access_extraction_result(ad.result_id, $2)
        )
      )
  );
$$;

create or replace function public.is_feature_update_target_recipient(
  update_id uuid,
  member_user_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  if member_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.feature_update_targets target
    where target.feature_update_id = update_id
      and (
        target.target_type = 'all_users'
        or (
          target.target_type = 'selected_users'
          and public.jsonb_text_array_contains(target.target_payload, 'userIds', member_user_id)
        )
        or (
          target.target_type = 'project_members'
          and lower(coalesce(target.target_payload ->> 'projectId', '')) ~ uuid_pattern
          and public.is_project_member((target.target_payload ->> 'projectId')::uuid, member_user_id)
        )
        or (
          target.target_type = 'segment'
          and lower(coalesce(target.target_payload ->> 'segmentId', '')) ~ uuid_pattern
          and exists (
            select 1
            from public.user_segment_members member
            where member.segment_id = (target.target_payload ->> 'segmentId')::uuid
              and member.user_id = member_user_id
          )
        )
        or (
          target.target_type = 'admins'
          and public.is_admin_user()
        )
        or (
          target.target_type = 'beta_users'
          and (
            public.jsonb_text_array_contains(target.target_payload, 'userIds', member_user_id)
            or case
              when lower(member_user_id) ~ uuid_pattern then exists (
                select 1
                from auth.users users
                where users.id = member_user_id::uuid
                  and (
                    lower(coalesce(users.raw_app_meta_data ->> 'role', '')) = 'beta'
                    or lower(coalesce(users.raw_app_meta_data ->> 'beta', '')) in ('true', '1', 'yes')
                    or lower(coalesce(users.raw_app_meta_data ->> 'beta_user', '')) in ('true', '1', 'yes')
                  )
              )
              else false
            end
          )
        )
      )
  );
exception
  when others then
    return false;
end;
$$;

revoke all on function public.is_conversation_member(uuid, text) from public;
revoke all on function public.is_message_in_member_conversation(uuid, text) from public;
revoke all on function public.is_project_member(uuid, text) from public;
revoke all on function public.can_access_project_file(uuid, text) from public;
revoke all on function public.can_access_extraction_result(uuid, text) from public;
revoke all on function public.can_access_extraction_result_item(uuid, text) from public;
revoke all on function public.can_access_result_item(uuid, text) from public;
revoke all on function public.can_access_approved_dataset(uuid, text) from public;
revoke all on function public.is_feature_update_target_recipient(uuid, text) from public;

grant execute on function public.is_conversation_member(uuid, text) to authenticated;
grant execute on function public.is_message_in_member_conversation(uuid, text) to authenticated;
grant execute on function public.is_project_member(uuid, text) to authenticated;
grant execute on function public.can_access_project_file(uuid, text) to authenticated;
grant execute on function public.can_access_extraction_result(uuid, text) to authenticated;
grant execute on function public.can_access_extraction_result_item(uuid, text) to authenticated;
grant execute on function public.can_access_result_item(uuid, text) to authenticated;
grant execute on function public.can_access_approved_dataset(uuid, text) to authenticated;
grant execute on function public.is_feature_update_target_recipient(uuid, text) to authenticated;

create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (user_id = (select public.current_user_id_text()));

create policy notifications_update_own_read
  on public.notifications
  for update
  to authenticated
  using (user_id = (select public.current_user_id_text()))
  with check (user_id = (select public.current_user_id_text()));

create policy notification_events_select_own
  on public.notification_events
  for select
  to authenticated
  using (user_id = (select public.current_user_id_text()));

create policy extraction_tasks_select_own
  on public.extraction_tasks
  for select
  to authenticated
  using (user_id = (select public.current_user_id_text()));

create policy push_subscriptions_select_own
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = (select public.current_user_id_text()));

create policy push_subscriptions_insert_own
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = (select public.current_user_id_text()));

create policy push_subscriptions_delete_own
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = (select public.current_user_id_text()));

create policy conversations_select_member
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_member(id, (select public.current_user_id_text())));

create policy conversation_members_select_member
  on public.conversation_members
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id, (select public.current_user_id_text())));

create policy messages_select_member
  on public.messages
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id, (select public.current_user_id_text())));

create policy messages_insert_member_user_sender
  on public.messages
  for insert
  to authenticated
  with check (
    sender_type = 'user'
    and sender_id = (select public.current_user_id_text())
    and public.is_conversation_member(conversation_id, (select public.current_user_id_text()))
  );

create policy message_reads_select_own
  on public.message_reads
  for select
  to authenticated
  using (
    user_id = (select public.current_user_id_text())
    and public.is_message_in_member_conversation(message_id, (select public.current_user_id_text()))
  );

create policy message_reads_insert_own
  on public.message_reads
  for insert
  to authenticated
  with check (
    user_id = (select public.current_user_id_text())
    and public.is_message_in_member_conversation(message_id, (select public.current_user_id_text()))
  );

create policy message_reads_update_own
  on public.message_reads
  for update
  to authenticated
  using (
    user_id = (select public.current_user_id_text())
    and public.is_message_in_member_conversation(message_id, (select public.current_user_id_text()))
  )
  with check (
    user_id = (select public.current_user_id_text())
    and public.is_message_in_member_conversation(message_id, (select public.current_user_id_text()))
  );

create policy message_reads_delete_own
  on public.message_reads
  for delete
  to authenticated
  using (
    user_id = (select public.current_user_id_text())
    and public.is_message_in_member_conversation(message_id, (select public.current_user_id_text()))
  );

create policy user_notification_preferences_select_own
  on public.user_notification_preferences
  for select
  to authenticated
  using (user_id = (select public.current_user_id_text()));

create policy user_notification_preferences_insert_own
  on public.user_notification_preferences
  for insert
  to authenticated
  with check (user_id = (select public.current_user_id_text()));

create policy user_notification_preferences_update_own
  on public.user_notification_preferences
  for update
  to authenticated
  using (user_id = (select public.current_user_id_text()))
  with check (user_id = (select public.current_user_id_text()));

create policy notification_preference_defaults_select_authenticated
  on public.notification_preference_defaults
  for select
  to authenticated
  using (true);

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

create policy project_activity_events_select_policy
  on public.project_activity_events
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or (
      visibility = 'project'
      and public.is_project_member(project_id, (select public.current_user_id_text()))
    )
  );

create policy project_activity_events_no_client_insert
  on public.project_activity_events
  for insert
  to authenticated
  with check (false);

create policy project_files_select_accessible
  on public.project_files
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select public.current_user_id_text())
    or (
      project_id is not null
      and public.is_project_member(project_id, (select public.current_user_id_text()))
    )
  );

create policy project_files_no_client_insert
  on public.project_files
  for insert
  to authenticated
  with check (false);

create policy project_files_no_client_update
  on public.project_files
  for update
  to authenticated
  using (false)
  with check (false);

create policy file_events_select_accessible
  on public.file_events
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select public.current_user_id_text())
    or (
      project_id is not null
      and public.is_project_member(project_id, (select public.current_user_id_text()))
    )
    or public.can_access_project_file(file_id, (select public.current_user_id_text()))
  );

create policy file_events_no_client_insert
  on public.file_events
  for insert
  to authenticated
  with check (false);

create policy extraction_results_select_accessible
  on public.extraction_results
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select public.current_user_id_text())
    or (
      project_id is not null
      and public.is_project_member(project_id, (select public.current_user_id_text()))
    )
  );

create policy extraction_results_update_accessible
  on public.extraction_results
  for update
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select public.current_user_id_text())
    or (
      project_id is not null
      and public.is_project_member(project_id, (select public.current_user_id_text()))
    )
  )
  with check (
    (select public.is_admin_user())
    or user_id = (select public.current_user_id_text())
    or (
      project_id is not null
      and public.is_project_member(project_id, (select public.current_user_id_text()))
    )
  );

create policy extraction_results_no_client_insert
  on public.extraction_results
  for insert
  to authenticated
  with check (false);

create policy extraction_result_items_select_accessible
  on public.extraction_result_items
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy extraction_result_items_update_accessible
  on public.extraction_result_items
  for update
  to authenticated
  using (
    (select public.is_admin_user())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  )
  with check (
    (select public.is_admin_user())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy extraction_result_items_no_client_insert
  on public.extraction_result_items
  for insert
  to authenticated
  with check (false);

create policy extraction_result_reviews_select_accessible
  on public.extraction_result_reviews
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or reviewer_id = (select public.current_user_id_text())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy extraction_result_reviews_no_client_insert
  on public.extraction_result_reviews
  for insert
  to authenticated
  with check (false);

create policy extraction_result_exports_select_accessible
  on public.extraction_result_exports
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select public.current_user_id_text())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy extraction_result_exports_no_client_insert
  on public.extraction_result_exports
  for insert
  to authenticated
  with check (false);

create policy result_items_select_accessible
  on public.result_items
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy result_items_no_client_insert
  on public.result_items
  for insert
  to authenticated
  with check (false);

create policy result_items_no_client_update
  on public.result_items
  for update
  to authenticated
  using (false)
  with check (false);

create policy result_reviews_select_accessible
  on public.result_reviews
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or reviewer_id = (select public.current_user_id_text())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy result_reviews_insert_self
  on public.result_reviews
  for insert
  to authenticated
  with check (
    reviewer_id = (select public.current_user_id_text())
    and public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy result_corrections_select_accessible
  on public.result_corrections
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or corrected_by = (select public.current_user_id_text())
    or public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy result_corrections_insert_self
  on public.result_corrections
  for insert
  to authenticated
  with check (
    corrected_by = (select public.current_user_id_text())
    and public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
  );

create policy approved_datasets_select_accessible
  on public.approved_datasets
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select public.current_user_id_text())
    or (
      project_id is not null
      and public.is_project_member(project_id, (select public.current_user_id_text()))
    )
    or (
      result_id is not null
      and public.can_access_extraction_result(result_id, (select public.current_user_id_text()))
    )
  );

create policy approved_datasets_no_client_insert
  on public.approved_datasets
  for insert
  to authenticated
  with check (false);

create policy approved_datasets_no_client_update
  on public.approved_datasets
  for update
  to authenticated
  using (false)
  with check (false);

create policy feature_updates_public_published_select
  on public.feature_updates
  for select
  to anon, authenticated
  using (
    status = 'published'
    and visibility = 'public'
  );

create policy feature_updates_authenticated_published_select
  on public.feature_updates
  for select
  to authenticated
  using (
    status = 'published'
    and (
      visibility in ('public', 'authenticated')
      or (
        visibility = 'targeted'
        and public.is_feature_update_target_recipient(id, (select public.current_user_id_text()))
      )
      or (
        visibility = 'admin_only'
        and (select public.is_admin_user())
      )
    )
  );

create policy feature_updates_admin_select
  on public.feature_updates
  for select
  to authenticated
  using ((select public.is_admin_user()));

create policy feature_updates_no_client_write
  on public.feature_updates
  for all
  to authenticated
  using (false)
  with check (false);

create policy feature_update_targets_admin_select
  on public.feature_update_targets
  for select
  to authenticated
  using ((select public.is_admin_user()));

create policy feature_update_targets_no_client_write
  on public.feature_update_targets
  for all
  to authenticated
  using (false)
  with check (false);

create policy feature_update_reads_own_select
  on public.feature_update_reads
  for select
  to authenticated
  using (
    user_id = (select public.current_user_id_text())
    or (select public.is_admin_user())
  );

create policy feature_update_reads_own_insert
  on public.feature_update_reads
  for insert
  to authenticated
  with check (user_id = (select public.current_user_id_text()));

create policy feature_update_reads_own_update
  on public.feature_update_reads
  for update
  to authenticated
  using (user_id = (select public.current_user_id_text()))
  with check (user_id = (select public.current_user_id_text()));

create policy feature_update_reactions_own_select
  on public.feature_update_reactions
  for select
  to authenticated
  using (
    user_id = (select public.current_user_id_text())
    or (select public.is_admin_user())
  );

create policy feature_update_reactions_own_insert
  on public.feature_update_reactions
  for insert
  to authenticated
  with check (user_id = (select public.current_user_id_text()));

create policy feature_update_reactions_own_update
  on public.feature_update_reactions
  for update
  to authenticated
  using (user_id = (select public.current_user_id_text()))
  with check (user_id = (select public.current_user_id_text()));

create policy feature_update_reactions_own_delete
  on public.feature_update_reactions
  for delete
  to authenticated
  using (user_id = (select public.current_user_id_text()));

create policy feature_update_feedback_own_select
  on public.feature_update_feedback
  for select
  to authenticated
  using (
    user_id = (select public.current_user_id_text())
    or (select public.is_admin_user())
  );

create policy feature_update_feedback_own_insert
  on public.feature_update_feedback
  for insert
  to authenticated
  with check (user_id = (select public.current_user_id_text()));

create policy feature_update_feedback_admin_update
  on public.feature_update_feedback
  for update
  to authenticated
  using ((select public.is_admin_user()))
  with check ((select public.is_admin_user()));
