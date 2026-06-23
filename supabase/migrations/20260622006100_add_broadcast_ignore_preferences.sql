alter table public.broadcasts
  add column if not exists ignore_preferences boolean not null default false;

create index if not exists broadcasts_ignore_preferences_idx
  on public.broadcasts (ignore_preferences);
