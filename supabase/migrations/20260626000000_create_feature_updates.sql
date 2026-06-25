create table if not exists public.feature_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  content text not null,
  category text not null default 'new_feature',
  status text not null default 'draft',
  visibility text not null default 'public',
  version text,
  release_date timestamptz,
  published_at timestamptz,
  created_by uuid,
  updated_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_updates_title_not_blank_check check (length(btrim(title)) > 0),
  constraint feature_updates_slug_not_blank_check check (length(btrim(slug)) > 0),
  constraint feature_updates_summary_not_blank_check check (length(btrim(summary)) > 0),
  constraint feature_updates_content_not_blank_check check (length(btrim(content)) > 0),
  constraint feature_updates_category_check check (
    category in (
      'new_feature',
      'improvement',
      'bug_fix',
      'security',
      'maintenance',
      'breaking_change',
      'experimental',
      'deprecation',
      'announcement'
    )
  ),
  constraint feature_updates_status_check check (
    status in ('draft', 'scheduled', 'published', 'archived')
  ),
  constraint feature_updates_visibility_check check (
    visibility in ('public', 'authenticated', 'admin_only', 'targeted')
  )
);

create table if not exists public.feature_update_targets (
  id uuid primary key default gen_random_uuid(),
  feature_update_id uuid not null references public.feature_updates(id) on delete cascade,
  target_type text not null default 'all_users',
  target_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint feature_update_targets_target_type_check check (
    target_type in (
      'all_users',
      'selected_users',
      'project_members',
      'segment',
      'admins',
      'beta_users'
    )
  )
);

create table if not exists public.feature_update_reads (
  id uuid primary key default gen_random_uuid(),
  feature_update_id uuid not null references public.feature_updates(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  constraint feature_update_reads_update_user_key unique (feature_update_id, user_id)
);

create table if not exists public.feature_update_reactions (
  id uuid primary key default gen_random_uuid(),
  feature_update_id uuid not null references public.feature_updates(id) on delete cascade,
  user_id uuid not null,
  reaction text not null,
  created_at timestamptz not null default now(),
  constraint feature_update_reactions_update_user_key unique (feature_update_id, user_id),
  constraint feature_update_reactions_reaction_check check (
    reaction in ('useful', 'excited', 'confused', 'not_relevant')
  )
);

create table if not exists public.feature_update_feedback (
  id uuid primary key default gen_random_uuid(),
  feature_update_id uuid not null references public.feature_updates(id) on delete cascade,
  user_id uuid not null,
  feedback text not null,
  rating integer,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_update_feedback_feedback_not_blank_check check (length(btrim(feedback)) > 0),
  constraint feature_update_feedback_rating_check check (
    rating is null or (rating >= 1 and rating <= 5)
  ),
  constraint feature_update_feedback_status_check check (
    status in ('open', 'reviewed', 'resolved', 'archived')
  )
);

create index if not exists feature_updates_slug_idx
  on public.feature_updates (slug);
create index if not exists feature_updates_category_idx
  on public.feature_updates (category);
create index if not exists feature_updates_status_idx
  on public.feature_updates (status);
create index if not exists feature_updates_visibility_idx
  on public.feature_updates (visibility);
create index if not exists feature_updates_version_idx
  on public.feature_updates (version);
create index if not exists feature_updates_published_at_idx
  on public.feature_updates (published_at desc);

create index if not exists feature_update_targets_update_id_idx
  on public.feature_update_targets (feature_update_id);
create index if not exists feature_update_reads_update_id_idx
  on public.feature_update_reads (feature_update_id);
create index if not exists feature_update_reads_user_id_idx
  on public.feature_update_reads (user_id);
create index if not exists feature_update_reactions_update_id_idx
  on public.feature_update_reactions (feature_update_id);
create index if not exists feature_update_reactions_user_id_idx
  on public.feature_update_reactions (user_id);
create index if not exists feature_update_feedback_update_id_idx
  on public.feature_update_feedback (feature_update_id);
create index if not exists feature_update_feedback_user_id_idx
  on public.feature_update_feedback (user_id);
create index if not exists feature_update_feedback_status_idx
  on public.feature_update_feedback (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_feature_updates_updated_at on public.feature_updates;
create trigger set_feature_updates_updated_at
  before update on public.feature_updates
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_feature_update_feedback_updated_at on public.feature_update_feedback;
create trigger set_feature_update_feedback_updated_at
  before update on public.feature_update_feedback
  for each row
  execute function public.set_updated_at();

create or replace function public.jsonb_text_array_contains(
  payload jsonb,
  field_name text,
  expected text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements_text(coalesce(payload -> field_name, '[]'::jsonb)) as item(value)
    where item.value = expected
  );
$$;

create or replace function public.is_feature_update_target_recipient(
  update_id uuid,
  member_user_id uuid
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
          and public.jsonb_text_array_contains(target.target_payload, 'userIds', member_user_id::text)
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
            public.jsonb_text_array_contains(target.target_payload, 'userIds', member_user_id::text)
            or exists (
              select 1
              from auth.users users
              where users.id = member_user_id
                and (
                  lower(coalesce(users.raw_app_meta_data ->> 'role', '')) = 'beta'
                  or lower(coalesce(users.raw_app_meta_data ->> 'beta', '')) in ('true', '1', 'yes')
                  or lower(coalesce(users.raw_app_meta_data ->> 'beta_user', '')) in ('true', '1', 'yes')
                )
            )
          )
        )
      )
  );
exception
  when others then
    return false;
end;
$$;

revoke all on function public.jsonb_text_array_contains(jsonb, text, text) from public;
grant execute on function public.jsonb_text_array_contains(jsonb, text, text) to anon, authenticated;

revoke all on function public.is_feature_update_target_recipient(uuid, uuid) from public;
grant execute on function public.is_feature_update_target_recipient(uuid, uuid) to authenticated;

alter table public.feature_updates enable row level security;
alter table public.feature_update_targets enable row level security;
alter table public.feature_update_reads enable row level security;
alter table public.feature_update_reactions enable row level security;
alter table public.feature_update_feedback enable row level security;

revoke all on table public.feature_updates from anon, authenticated;
revoke all on table public.feature_update_targets from anon, authenticated;
revoke all on table public.feature_update_reads from anon, authenticated;
revoke all on table public.feature_update_reactions from anon, authenticated;
revoke all on table public.feature_update_feedback from anon, authenticated;

grant select on table public.feature_updates to anon, authenticated;
grant select, insert, update on table public.feature_update_reads to authenticated;
grant select, insert, update, delete on table public.feature_update_reactions to authenticated;
grant select, insert, update on table public.feature_update_feedback to authenticated;

drop policy if exists feature_updates_public_published_select on public.feature_updates;
create policy feature_updates_public_published_select
  on public.feature_updates
  for select
  to anon, authenticated
  using (
    status = 'published'
    and visibility = 'public'
  );

drop policy if exists feature_updates_authenticated_published_select on public.feature_updates;
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
        and public.is_feature_update_target_recipient(id, (select auth.uid()))
      )
      or (
        visibility = 'admin_only'
        and (select public.is_admin_user())
      )
    )
  );

drop policy if exists feature_updates_admin_select on public.feature_updates;
create policy feature_updates_admin_select
  on public.feature_updates
  for select
  to authenticated
  using ((select public.is_admin_user()));

drop policy if exists feature_updates_no_client_write on public.feature_updates;
create policy feature_updates_no_client_write
  on public.feature_updates
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists feature_update_targets_admin_select on public.feature_update_targets;
create policy feature_update_targets_admin_select
  on public.feature_update_targets
  for select
  to authenticated
  using ((select public.is_admin_user()));

drop policy if exists feature_update_targets_no_client_write on public.feature_update_targets;
create policy feature_update_targets_no_client_write
  on public.feature_update_targets
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists feature_update_reads_own_select on public.feature_update_reads;
create policy feature_update_reads_own_select
  on public.feature_update_reads
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin_user())
  );

drop policy if exists feature_update_reads_own_insert on public.feature_update_reads;
create policy feature_update_reads_own_insert
  on public.feature_update_reads
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists feature_update_reads_own_update on public.feature_update_reads;
create policy feature_update_reads_own_update
  on public.feature_update_reads
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists feature_update_reactions_own_select on public.feature_update_reactions;
create policy feature_update_reactions_own_select
  on public.feature_update_reactions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin_user())
  );

drop policy if exists feature_update_reactions_own_insert on public.feature_update_reactions;
create policy feature_update_reactions_own_insert
  on public.feature_update_reactions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists feature_update_reactions_own_update on public.feature_update_reactions;
create policy feature_update_reactions_own_update
  on public.feature_update_reactions
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists feature_update_reactions_own_delete on public.feature_update_reactions;
create policy feature_update_reactions_own_delete
  on public.feature_update_reactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists feature_update_feedback_own_select on public.feature_update_feedback;
create policy feature_update_feedback_own_select
  on public.feature_update_feedback
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin_user())
  );

drop policy if exists feature_update_feedback_own_insert on public.feature_update_feedback;
create policy feature_update_feedback_own_insert
  on public.feature_update_feedback
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists feature_update_feedback_admin_update on public.feature_update_feedback;
create policy feature_update_feedback_admin_update
  on public.feature_update_feedback
  for update
  to authenticated
  using ((select public.is_admin_user()))
  with check ((select public.is_admin_user()));

alter table public.service_api_keys
  drop constraint if exists service_api_keys_scopes_check;

alter table public.service_api_keys
  add constraint service_api_keys_scopes_check check (
    scopes <@ array[
      'notifications:create',
      'tasks:update',
      'messages:create',
      'webhooks:send',
      'admin:broadcast',
      'admin:broadcast:all',
      'files:create',
      'files:update',
      'files:delete',
      'results:create',
      'results:update',
      'results:export',
      'feature_updates:create',
      'feature_updates:publish'
    ]::text[]
  );
