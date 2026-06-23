create table if not exists public.service_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  service_name text not null,
  allowed_sources text[] not null default '{}',
  scopes text[] not null default '{}',
  active boolean not null default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_api_keys_scopes_check check (
    scopes <@ array[
      'notifications:create',
      'tasks:update',
      'messages:create',
      'webhooks:send',
      'admin:broadcast',
      'admin:broadcast:all'
    ]::text[]
  )
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  source text not null,
  event_type text not null,
  user_id uuid,
  project_id uuid,
  task_id uuid,
  conversation_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  error_message text,
  idempotency_key text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_events_status_check check (
    status in ('received', 'processing', 'processed', 'failed', 'ignored')
  )
);

create table if not exists public.webhook_event_logs (
  id uuid primary key default gen_random_uuid(),
  webhook_event_id uuid not null references public.webhook_events(id) on delete cascade,
  level text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint webhook_event_logs_level_check check (
    level in ('debug', 'info', 'warning', 'error')
  )
);

create index if not exists service_api_keys_key_hash_idx
  on public.service_api_keys (key_hash);

create index if not exists service_api_keys_service_name_idx
  on public.service_api_keys (service_name);

create index if not exists webhook_events_service_name_idx
  on public.webhook_events (service_name);

create index if not exists webhook_events_event_type_idx
  on public.webhook_events (event_type);

create index if not exists webhook_events_user_id_idx
  on public.webhook_events (user_id);

create index if not exists webhook_events_project_id_idx
  on public.webhook_events (project_id);

create index if not exists webhook_events_task_id_idx
  on public.webhook_events (task_id);

create index if not exists webhook_events_status_idx
  on public.webhook_events (status);

create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at desc);

create index if not exists webhook_events_idempotency_key_idx
  on public.webhook_events (idempotency_key);

create unique index if not exists webhook_events_service_idempotency_key_idx
  on public.webhook_events (service_name, idempotency_key)
  where idempotency_key is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_service_api_keys_updated_at on public.service_api_keys;
create trigger set_service_api_keys_updated_at
  before update on public.service_api_keys
  for each row
  execute function public.set_updated_at();

alter table public.service_api_keys enable row level security;
alter table public.webhook_events enable row level security;
alter table public.webhook_event_logs enable row level security;

revoke all on table public.service_api_keys from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;
revoke all on table public.webhook_event_logs from anon, authenticated;
