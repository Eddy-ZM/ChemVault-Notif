create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'project',
  project_id uuid,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_type_check check (
    type in ('project', 'support', 'system')
  )
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint conversation_members_role_check check (
    role in ('owner', 'admin', 'member', 'viewer')
  ),
  constraint conversation_members_conversation_user_key unique (
    conversation_id,
    user_id
  )
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid,
  sender_type text not null default 'user',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_sender_type_check check (
    sender_type in ('user', 'admin', 'system', 'ai', 'task')
  ),
  constraint messages_body_not_blank_check check (length(btrim(body)) > 0)
);

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  constraint message_reads_message_user_key unique (message_id, user_id)
);

create index if not exists conversations_project_id_idx
  on public.conversations (project_id);

create index if not exists conversation_members_conversation_id_idx
  on public.conversation_members (conversation_id);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members (user_id);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists message_reads_user_id_idx
  on public.message_reads (user_id);

create index if not exists message_reads_message_id_idx
  on public.message_reads (message_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row
  execute function public.set_updated_at();

create or replace function public.is_conversation_member(
  conversation_id uuid,
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
    from public.conversation_members cm
    where cm.conversation_id = $1
      and cm.user_id = $2
  );
$$;

create or replace function public.is_message_in_member_conversation(
  message_id uuid,
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
    from public.messages m
    join public.conversation_members cm
      on cm.conversation_id = m.conversation_id
    where m.id = $1
      and cm.user_id = $2
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;
revoke all on function public.is_message_in_member_conversation(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.is_message_in_member_conversation(uuid, uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

revoke all on table public.conversations from anon, authenticated;
revoke all on table public.conversation_members from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.message_reads from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant select, insert on table public.messages to authenticated;
grant select, insert, delete on table public.message_reads to authenticated;
grant update (read_at) on table public.message_reads to authenticated;

drop policy if exists conversations_select_member on public.conversations;
create policy conversations_select_member
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_member(id, (select auth.uid())));

drop policy if exists conversation_members_select_member on public.conversation_members;
create policy conversation_members_select_member
  on public.conversation_members
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id, (select auth.uid())));

drop policy if exists messages_select_member on public.messages;
create policy messages_select_member
  on public.messages
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id, (select auth.uid())));

drop policy if exists messages_insert_member_user_sender on public.messages;
create policy messages_insert_member_user_sender
  on public.messages
  for insert
  to authenticated
  with check (
    sender_type = 'user'
    and sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id, (select auth.uid()))
  );

drop policy if exists message_reads_select_own on public.message_reads;
create policy message_reads_select_own
  on public.message_reads
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_message_in_member_conversation(message_id, (select auth.uid()))
  );

drop policy if exists message_reads_insert_own on public.message_reads;
create policy message_reads_insert_own
  on public.message_reads
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_message_in_member_conversation(message_id, (select auth.uid()))
  );

drop policy if exists message_reads_update_own on public.message_reads;
create policy message_reads_update_own
  on public.message_reads
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_message_in_member_conversation(message_id, (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and public.is_message_in_member_conversation(message_id, (select auth.uid()))
  );

drop policy if exists message_reads_delete_own on public.message_reads;
create policy message_reads_delete_own
  on public.message_reads
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_message_in_member_conversation(message_id, (select auth.uid()))
  );

alter table public.messages replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    )
  then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
