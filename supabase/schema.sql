-- Aster Bay — Supabase schema (Phase 3)
-- Run in the Supabase SQL editor. Requires auth enabled (magic link or OAuth).

-- ============ cloud saves ============
create table if not exists public.cities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Aster Bay',
  data        jsonb not null,            -- the full v3 save blob from exportCity()
  save_v      int  not null default 3,
  population  int  not null default 0,   -- denormalized for quick listing
  day         int  not null default 1,
  updated_at  timestamptz not null default now()
);

create index if not exists cities_user_idx on public.cities (user_id, updated_at desc);

alter table public.cities enable row level security;

create policy "own cities: select" on public.cities
  for select using (auth.uid() = user_id);
create policy "own cities: insert" on public.cities
  for insert with check (auth.uid() = user_id);
create policy "own cities: update" on public.cities
  for update using (auth.uid() = user_id);
create policy "own cities: delete" on public.cities
  for delete using (auth.uid() = user_id);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists cities_touch on public.cities;
create trigger cities_touch before update on public.cities
  for each row execute function public.touch_updated_at();

-- ============ public leaderboard ============
-- Separate table (not a view over cities) so save data stays private
-- while scores are world-readable. One row per user.
create table if not exists public.scores (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  city_name   text not null default 'Aster Bay',
  population  int  not null default 0,
  day         int  not null default 1,
  rank_name   text not null default 'Hamlet',
  updated_at  timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "scores: anyone can read" on public.scores
  for select using (true);
create policy "scores: owner upsert" on public.scores
  for insert with check (auth.uid() = user_id);
create policy "scores: owner update" on public.scores
  for update using (auth.uid() = user_id);

drop trigger if exists scores_touch on public.scores;
create trigger scores_touch before update on public.scores
  for each row execute function public.touch_updated_at();

-- NOTE (Phase 4): client-written scores are trust-on-first-write. When the
-- Railway backend exists, revoke insert/update from authenticated users and
-- write scores only from the server (service role) after validating the
-- submitted save blob (re-run recompute() server-side and compare population).

-- ============ client usage sketch ============
-- save:
--   supabase.from('cities').upsert({ id, user_id, name, data, population, day })
-- load latest:
--   supabase.from('cities').select('*').order('updated_at',{ascending:false}).limit(1)
-- leaderboard:
--   supabase.from('scores').select('*').order('population',{ascending:false}).limit(100)
