alter table public.extraction_results
  add column if not exists extraction_summary text;

alter table public.extraction_results
  drop constraint if exists extraction_results_status_check;

alter table public.extraction_results
  add constraint extraction_results_status_check check (
    status in (
      'draft',
      'ready_for_review',
      'in_review',
      'approved',
      'rejected',
      'rerun_requested',
      'archived',
      'exported'
    )
  );

create index if not exists extraction_results_created_at_idx
  on public.extraction_results (created_at desc);

create table if not exists public.result_items (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.extraction_results(id) on delete cascade,
  item_type text not null,
  label text,
  value jsonb not null default '{}'::jsonb,
  confidence_score numeric,
  page_number integer,
  source_location jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint result_items_item_type_check check (
    item_type in (
      'compound',
      'reaction',
      'table',
      'measurement',
      'spectrum',
      'property',
      'method',
      'condition',
      'citation',
      'note'
    )
  ),
  constraint result_items_status_check check (
    status in ('pending', 'accepted', 'corrected', 'rejected', 'uncertain')
  ),
  constraint result_items_confidence_score_check check (
    confidence_score is null
    or (confidence_score >= 0 and confidence_score <= 1)
  ),
  constraint result_items_page_number_check check (
    page_number is null or page_number > 0
  )
);

create table if not exists public.result_reviews (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.extraction_results(id) on delete cascade,
  reviewer_id uuid not null,
  action text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint result_reviews_action_check check (
    action in (
      'started_review',
      'item_accepted',
      'item_corrected',
      'item_rejected',
      'approved',
      'rejected',
      'rerun_requested',
      'comment_added'
    )
  )
);

create table if not exists public.result_corrections (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.extraction_results(id) on delete cascade,
  result_item_id uuid references public.result_items(id) on delete set null,
  corrected_by uuid not null,
  field_path text not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now(),
  constraint result_corrections_field_path_not_blank_check check (
    length(btrim(field_path)) > 0
  )
);

create table if not exists public.approved_datasets (
  id uuid primary key default gen_random_uuid(),
  result_id uuid references public.extraction_results(id) on delete set null,
  project_id uuid,
  file_id uuid,
  user_id uuid not null,
  title text not null,
  description text,
  data jsonb not null default '{}'::jsonb,
  schema_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_datasets_title_not_blank_check check (
    length(btrim(title)) > 0
  ),
  constraint approved_datasets_schema_version_not_blank_check check (
    length(btrim(schema_version)) > 0
  )
);

create index if not exists result_items_result_id_idx
  on public.result_items (result_id);

create index if not exists result_items_item_type_idx
  on public.result_items (item_type);

create index if not exists result_items_status_idx
  on public.result_items (status);

create index if not exists result_items_confidence_score_idx
  on public.result_items (confidence_score);

create index if not exists result_reviews_result_id_idx
  on public.result_reviews (result_id);

create index if not exists result_reviews_reviewer_id_idx
  on public.result_reviews (reviewer_id);

create index if not exists result_reviews_action_idx
  on public.result_reviews (action);

create index if not exists result_corrections_result_id_idx
  on public.result_corrections (result_id);

create index if not exists result_corrections_result_item_id_idx
  on public.result_corrections (result_item_id);

create index if not exists approved_datasets_project_id_idx
  on public.approved_datasets (project_id);

create index if not exists approved_datasets_file_id_idx
  on public.approved_datasets (file_id);

create index if not exists approved_datasets_user_id_idx
  on public.approved_datasets (user_id);

drop trigger if exists set_result_items_updated_at on public.result_items;
create trigger set_result_items_updated_at
  before update on public.result_items
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_approved_datasets_updated_at on public.approved_datasets;
create trigger set_approved_datasets_updated_at
  before update on public.approved_datasets
  for each row
  execute function public.set_updated_at();

create or replace function public.can_access_result_item(
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
    from public.result_items ri
    where ri.id = $1
      and public.can_access_extraction_result(ri.result_id, $2)
  );
$$;

create or replace function public.can_access_approved_dataset(
  dataset_id uuid,
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

revoke all on function public.can_access_result_item(uuid, uuid) from public;
revoke all on function public.can_access_approved_dataset(uuid, uuid) from public;
grant execute on function public.can_access_result_item(uuid, uuid) to authenticated;
grant execute on function public.can_access_approved_dataset(uuid, uuid) to authenticated;

alter table public.result_items enable row level security;
alter table public.result_reviews enable row level security;
alter table public.result_corrections enable row level security;
alter table public.approved_datasets enable row level security;

revoke all on table public.result_items from anon, authenticated;
revoke all on table public.result_reviews from anon, authenticated;
revoke all on table public.result_corrections from anon, authenticated;
revoke all on table public.approved_datasets from anon, authenticated;

grant select on table public.result_items to authenticated;
grant select, insert on table public.result_reviews to authenticated;
grant select, insert on table public.result_corrections to authenticated;
grant select on table public.approved_datasets to authenticated;

drop policy if exists result_items_select_accessible on public.result_items;
create policy result_items_select_accessible
  on public.result_items
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists result_items_no_client_insert on public.result_items;
create policy result_items_no_client_insert
  on public.result_items
  for insert
  to authenticated
  with check (false);

drop policy if exists result_items_no_client_update on public.result_items;
create policy result_items_no_client_update
  on public.result_items
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists result_reviews_select_accessible on public.result_reviews;
create policy result_reviews_select_accessible
  on public.result_reviews
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or reviewer_id = (select auth.uid())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists result_reviews_insert_self on public.result_reviews;
create policy result_reviews_insert_self
  on public.result_reviews
  for insert
  to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists result_corrections_select_accessible on public.result_corrections;
create policy result_corrections_select_accessible
  on public.result_corrections
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or corrected_by = (select auth.uid())
    or (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists result_corrections_insert_self on public.result_corrections;
create policy result_corrections_insert_self
  on public.result_corrections
  for insert
  to authenticated
  with check (
    corrected_by = (select auth.uid())
    and (select public.can_access_extraction_result(result_id, (select auth.uid())))
  );

drop policy if exists approved_datasets_select_accessible on public.approved_datasets;
create policy approved_datasets_select_accessible
  on public.approved_datasets
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    or user_id = (select auth.uid())
    or (
      project_id is not null
      and (select public.is_project_member(project_id, (select auth.uid())))
    )
    or (
      result_id is not null
      and (select public.can_access_extraction_result(result_id, (select auth.uid())))
    )
  );

drop policy if exists approved_datasets_no_client_insert on public.approved_datasets;
create policy approved_datasets_no_client_insert
  on public.approved_datasets
  for insert
  to authenticated
  with check (false);

drop policy if exists approved_datasets_no_client_update on public.approved_datasets;
create policy approved_datasets_no_client_update
  on public.approved_datasets
  for update
  to authenticated
  using (false)
  with check (false);

alter table public.result_items replica identity full;
alter table public.result_reviews replica identity full;
alter table public.result_corrections replica identity full;
alter table public.approved_datasets replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'result_items'
    )
  then
    alter publication supabase_realtime add table public.result_items;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'result_reviews'
    )
  then
    alter publication supabase_realtime add table public.result_reviews;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'result_corrections'
    )
  then
    alter publication supabase_realtime add table public.result_corrections;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'approved_datasets'
    )
  then
    alter publication supabase_realtime add table public.approved_datasets;
  end if;
end $$;
