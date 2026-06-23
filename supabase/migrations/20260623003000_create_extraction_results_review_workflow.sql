create table if not exists public.extraction_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  file_id uuid,
  project_id uuid,
  user_id uuid not null,
  status text not null default 'draft',
  result_type text not null default 'scientific_data',
  raw_output jsonb not null default '{}'::jsonb,
  structured_data jsonb not null default '{}'::jsonb,
  confidence_score numeric,
  model_name text,
  model_version text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extraction_results_status_check check (
    status in (
      'draft',
      'ready_for_review',
      'in_review',
      'approved',
      'rejected',
      'exported',
      'archived'
    )
  ),
  constraint extraction_results_result_type_not_blank_check check (
    length(btrim(result_type)) > 0
  ),
  constraint extraction_results_confidence_score_check check (
    confidence_score is null
    or (confidence_score >= 0 and confidence_score <= 1)
  )
);

create table if not exists public.extraction_result_items (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.extraction_results(id) on delete cascade,
  item_type text not null,
  label text,
  value jsonb not null default '{}'::jsonb,
  original_value jsonb,
  confidence_score numeric,
  status text not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extraction_result_items_item_type_check check (
    item_type in (
      'table',
      'compound',
      'reaction',
      'property',
      'experimental_condition',
      'measurement',
      'reference',
      'note'
    )
  ),
  constraint extraction_result_items_status_check check (
    status in ('pending', 'accepted', 'corrected', 'rejected')
  ),
  constraint extraction_result_items_confidence_score_check check (
    confidence_score is null
    or (confidence_score >= 0 and confidence_score <= 1)
  )
);

create table if not exists public.extraction_result_reviews (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.extraction_results(id) on delete cascade,
  reviewer_id uuid not null,
  action text not null,
  comment text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint extraction_result_reviews_action_check check (
    action in (
      'review_started',
      'item_accepted',
      'item_corrected',
      'item_rejected',
      'result_approved',
      'result_rejected',
      'export_created'
    )
  )
);

create table if not exists public.extraction_result_exports (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.extraction_results(id) on delete cascade,
  user_id uuid not null,
  export_type text not null,
  storage_bucket text,
  storage_path text,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint extraction_result_exports_export_type_check check (
    export_type in ('json', 'csv', 'xlsx')
  ),
  constraint extraction_result_exports_status_check check (
    status in ('created', 'failed', 'deleted')
  )
);

create index if not exists extraction_results_task_id_idx
  on public.extraction_results (task_id);

create index if not exists extraction_results_file_id_idx
  on public.extraction_results (file_id);

create index if not exists extraction_results_project_id_idx
  on public.extraction_results (project_id);

create index if not exists extraction_results_user_id_idx
  on public.extraction_results (user_id);

create index if not exists extraction_results_status_idx
  on public.extraction_results (status);

create index if not exists extraction_result_items_result_id_idx
  on public.extraction_result_items (result_id);

create index if not exists extraction_result_items_item_type_idx
  on public.extraction_result_items (item_type);

create index if not exists extraction_result_items_status_idx
  on public.extraction_result_items (status);

create index if not exists extraction_result_reviews_result_id_idx
  on public.extraction_result_reviews (result_id);

create index if not exists extraction_result_reviews_reviewer_id_idx
  on public.extraction_result_reviews (reviewer_id);

create index if not exists extraction_result_exports_result_id_idx
  on public.extraction_result_exports (result_id);

create index if not exists extraction_result_exports_user_id_idx
  on public.extraction_result_exports (user_id);

drop trigger if exists set_extraction_results_updated_at on public.extraction_results;
create trigger set_extraction_results_updated_at
  before update on public.extraction_results
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_extraction_result_items_updated_at on public.extraction_result_items;
create trigger set_extraction_result_items_updated_at
  before update on public.extraction_result_items
  for each row
  execute function public.set_updated_at();

create or replace function public.can_access_extraction_result(
  result_id uuid,
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
    from public.extraction_result_items eri
    where eri.id = $1
      and public.can_access_extraction_result(eri.result_id, $2)
  );
$$;

revoke all on function public.can_access_extraction_result(uuid, uuid) from public;
revoke all on function public.can_access_extraction_result_item(uuid, uuid) from public;
grant execute on function public.can_access_extraction_result(uuid, uuid) to authenticated;
grant execute on function public.can_access_extraction_result_item(uuid, uuid) to authenticated;

alter table public.extraction_results enable row level security;
alter table public.extraction_result_items enable row level security;
alter table public.extraction_result_reviews enable row level security;
alter table public.extraction_result_exports enable row level security;

revoke all on table public.extraction_results from anon, authenticated;
revoke all on table public.extraction_result_items from anon, authenticated;
revoke all on table public.extraction_result_reviews from anon, authenticated;
revoke all on table public.extraction_result_exports from anon, authenticated;

grant select, update on table public.extraction_results to authenticated;
grant select, update on table public.extraction_result_items to authenticated;
grant select on table public.extraction_result_reviews to authenticated;
grant select on table public.extraction_result_exports to authenticated;

drop policy if exists extraction_results_select_accessible on public.extraction_results;
create policy extraction_results_select_accessible
  on public.extraction_results
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select auth.uid())
    or (
      project_id is not null
      and (select public.is_project_member(project_id, (select auth.uid())))
    )
  );

drop policy if exists extraction_results_update_accessible on public.extraction_results;
create policy extraction_results_update_accessible
  on public.extraction_results
  for update
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select auth.uid())
    or (
      project_id is not null
      and (select public.is_project_member(project_id, (select auth.uid())))
    )
  )
  with check (
    (select public.is_admin_user())
    or user_id = (select auth.uid())
    or (
      project_id is not null
      and (select public.is_project_member(project_id, (select auth.uid())))
    )
  );

drop policy if exists extraction_results_no_client_insert on public.extraction_results;
create policy extraction_results_no_client_insert
  on public.extraction_results
  for insert
  to authenticated
  with check (false);

drop policy if exists extraction_result_items_select_accessible on public.extraction_result_items;
create policy extraction_result_items_select_accessible
  on public.extraction_result_items
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists extraction_result_items_update_accessible on public.extraction_result_items;
create policy extraction_result_items_update_accessible
  on public.extraction_result_items
  for update
  to authenticated
  using (
    (select public.is_admin_user())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  )
  with check (
    (select public.is_admin_user())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists extraction_result_items_no_client_insert on public.extraction_result_items;
create policy extraction_result_items_no_client_insert
  on public.extraction_result_items
  for insert
  to authenticated
  with check (false);

drop policy if exists extraction_result_reviews_select_accessible on public.extraction_result_reviews;
create policy extraction_result_reviews_select_accessible
  on public.extraction_result_reviews
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or reviewer_id = (select auth.uid())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists extraction_result_reviews_no_client_insert on public.extraction_result_reviews;
create policy extraction_result_reviews_no_client_insert
  on public.extraction_result_reviews
  for insert
  to authenticated
  with check (false);

drop policy if exists extraction_result_exports_select_accessible on public.extraction_result_exports;
create policy extraction_result_exports_select_accessible
  on public.extraction_result_exports
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select auth.uid())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists extraction_result_exports_no_client_insert on public.extraction_result_exports;
create policy extraction_result_exports_no_client_insert
  on public.extraction_result_exports
  for insert
  to authenticated
  with check (false);

alter table public.extraction_results replica identity full;
alter table public.extraction_result_items replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'extraction_results'
    )
  then
    alter publication supabase_realtime add table public.extraction_results;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'extraction_result_items'
    )
  then
    alter publication supabase_realtime add table public.extraction_result_items;
  end if;
end $$;
