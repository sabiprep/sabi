-- Stage 3: Multi-tier JAMB League Standings (Blue -> Silver -> Gold)
-- Tracks real candidate XP, streak, and weekly promotion/demotion history across devices.

create table if not exists public.student_league_standings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Scholar',
  avatar_color text not null default '#711AE3',
  league_tier text not null check (league_tier in ('blue', 'silver', 'gold')),
  previous_tier text check (previous_tier in ('unranked', 'blue', 'silver', 'gold')),
  movement text not null default 'entered' check (movement in ('entered', 'promoted', 'demoted', 'stayed')),
  weekly_xp integer not null default 0 check (weekly_xp >= 0),
  total_xp integer not null default 0 check (total_xp >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  questions_solved integer not null default 0 check (questions_solved >= 0),
  week_key text not null default to_char(timezone('Africa/Lagos', now()), 'IYYY-"W"IW'),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_league_standings_tier_xp
  on public.student_league_standings (league_tier, total_xp desc, updated_at desc);

create index if not exists idx_student_league_standings_week
  on public.student_league_standings (week_key, league_tier, weekly_xp desc);

alter table public.student_league_standings enable row level security;

drop policy if exists "Authenticated users can view league standings"
  on public.student_league_standings;
create policy "Authenticated users can view league standings"
  on public.student_league_standings
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own league standing"
  on public.student_league_standings;
create policy "Users can insert own league standing"
  on public.student_league_standings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own league standing"
  on public.student_league_standings;
create policy "Users can update own league standing"
  on public.student_league_standings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
