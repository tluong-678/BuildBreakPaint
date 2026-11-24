create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled world',
  type text not null default 'manual' check (type in ('manual','auto','crash','exit')),
  world jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saves_user_updated_idx on public.saves(user_id, updated_at desc);

alter table public.saves enable row level security;

drop policy if exists "Users can read their own saves" on public.saves;
create policy "Users can read their own saves" on public.saves
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can create their own saves" on public.saves;
create policy "Users can create their own saves" on public.saves
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their own saves" on public.saves;
create policy "Users can update their own saves" on public.saves
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saves" on public.saves;
create policy "Users can delete their own saves" on public.saves
for delete to authenticated using (auth.uid() = user_id);

-- Persistent leaderboard
create table if not exists public.leaderboard (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  username text not null default 'Player',

  seconds_played bigint not null default 0
    check (seconds_played >= 0),

  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_time_idx
on public.leaderboard(seconds_played desc);

alter table public.leaderboard enable row level security;

drop policy if exists "Leaderboard is readable"
on public.leaderboard;

create policy "Leaderboard is readable"
on public.leaderboard
for select
to authenticated
using (true);

drop policy if exists "Users update own leaderboard"
on public.leaderboard;

create policy "Users update own leaderboard"
on public.leaderboard
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own playtime"
on public.leaderboard;

create policy "Users update own playtime"
on public.leaderboard
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
