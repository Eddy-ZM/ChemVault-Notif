create table if not exists public.user_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null default 'manual',
  criteria jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_segments_type_check check (type in ('manual', 'dynamic'))
);

create table if not exists public.user_segment_members (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.user_segments(id) on delete cascade,
  user_id uuid not null,
  added_by uuid,
  created_at timestamptz not null default now(),
  constraint user_segment_members_segment_user_key unique (segment_id, user_id)
);

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'system',
  source text not null default 'admin',
  link text,
  target_type text not null,
  target_payload jsonb not null default '{}'::jsonb,
  recipient_count integer not null default 0,
  status text not null default 'draft',
  created_by uuid,
  sent_by uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint broadcasts_target_type_check check (
    target_type in (
      'single_user',
      'selected_users',
      'project_members',
      'segment',
      'all_users'
    )
  ),
  constraint broadcasts_status_check check (
    status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')
  ),
  constraint broadcasts_recipient_count_check check (recipient_count >= 0)
);

create table if not exists public.broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  user_id uuid not null,
  notification_id uuid,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint broadcast_recipients_status_check check (
    status in ('pending', 'sent', 'failed', 'skipped')
  ),
  constraint broadcast_recipients_broadcast_user_key unique (
    broadcast_id,
    user_id
  )
);

create table if not exists public.broadcast_audit_logs (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  actor_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_segments_type_idx
  on public.user_segments (type);

create index if not exists user_segment_members_segment_id_idx
  on public.user_segment_members (segment_id);

create index if not exists user_segment_members_user_id_idx
  on public.user_segment_members (user_id);

create index if not exists broadcasts_status_idx
  on public.broadcasts (status);

create index if not exists broadcasts_target_type_idx
  on public.broadcasts (target_type);

create index if not exists broadcasts_created_by_idx
  on public.broadcasts (created_by);

create index if not exists broadcast_recipients_broadcast_id_idx
  on public.broadcast_recipients (broadcast_id);

create index if not exists broadcast_recipients_user_id_idx
  on public.broadcast_recipients (user_id);

create index if not exists broadcast_recipients_status_idx
  on public.broadcast_recipients (status);

create index if not exists broadcast_audit_logs_broadcast_id_idx
  on public.broadcast_audit_logs (broadcast_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_segments_updated_at on public.user_segments;
create trigger set_user_segments_updated_at
  before update on public.user_segments
  for each row
  execute function public.set_updated_at();

alter table public.user_segments enable row level security;
alter table public.user_segment_members enable row level security;
alter table public.broadcasts enable row level security;
alter table public.broadcast_recipients enable row level security;
alter table public.broadcast_audit_logs enable row level security;

revoke all on table public.user_segments from anon, authenticated;
revoke all on table public.user_segment_members from anon, authenticated;
revoke all on table public.broadcasts from anon, authenticated;
revoke all on table public.broadcast_recipients from anon, authenticated;
revoke all on table public.broadcast_audit_logs from anon, authenticated;
