drop policy if exists feature_updates_public_published_select on public.feature_updates;
create policy feature_updates_public_published_select
  on public.feature_updates
  for select
  to anon
  using (
    status = 'published'
    and visibility = 'public'
  );

drop policy if exists feature_updates_authenticated_published_select on public.feature_updates;
drop policy if exists feature_updates_admin_select on public.feature_updates;
create policy feature_updates_authenticated_select
  on public.feature_updates
  for select
  to authenticated
  using (
    (select private.is_admin_user())
    or (
      status = 'published'
      and (
        visibility in ('public', 'authenticated')
        or (
          visibility = 'targeted'
          and private.is_feature_update_target_recipient(id, (select public.current_user_id_text()))
        )
        or visibility = 'admin_only' and (select private.is_admin_user())
      )
    )
  );
