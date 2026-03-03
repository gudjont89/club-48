-- ============================================================
-- 48 KLÚBBURINN — Supabase Schema
-- Icelandic Football Ground Tracker
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Prerequisites: Enable "Auth" in your Supabase project
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

-- Grounds: physical venues, independent of who plays there
create table public.grounds (
  id           bigint generated always as identity primary key,
  name         text not null,
  city         text not null,
  latitude     double precision,
  longitude    double precision,
  capacity     integer,
  surface      text default 'artificial',  -- 'artificial' | 'grass' | 'hybrid'
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table public.grounds is 'Physical football venues in Iceland';


-- Teams: the 48 clubs
create table public.teams (
  id           bigint generated always as identity primary key,
  name         text not null,
  short_name   text not null,           -- e.g. 'KR', 'FH', 'ÍBV'
  logo_url     text,
  founded      integer,
  city         text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table public.teams is 'Icelandic football clubs tracked by the 48 Club';


-- Team Seasons: maps a team to a division and ground for a specific season
-- This is the key relationship table — handles promotions, relegations,
-- ground moves, and ground-sharing naturally.
create table public.team_seasons (
  id           bigint generated always as identity primary key,
  team_id      bigint not null references public.teams(id) on delete cascade,
  season       integer not null,         -- e.g. 2025
  division     integer not null,         -- 1 = Besta deild, 2 = 1. deild, 3 = 2. deild, 4 = 3. deild
  ground_id    bigint not null references public.grounds(id) on delete restrict,
  notes        text,                     -- e.g. 'Temporary while main ground renovated'
  created_at   timestamptz default now(),

  constraint uq_team_season unique (team_id, season),
  constraint chk_division check (division between 1 and 4),
  constraint chk_season check (season between 2000 and 2100)
);

comment on table public.team_seasons is 'Per-season mapping of team → division + home ground';
comment on column public.team_seasons.division is '1=Besta deild, 2=1. deild, 3=2. deild, 4=3. deild';


-- Fixtures Cache: home matches pulled from API-Football
-- Stored per team_season so we know exactly which team/ground/season it belongs to
create table public.fixtures (
  id               bigint generated always as identity primary key,
  api_football_id  bigint unique,        -- external ID from API-Football, nullable for manual entries
  team_season_id   bigint not null references public.team_seasons(id) on delete cascade,
  round            integer,              -- matchday number
  match_date       date not null,
  kickoff_time     time,
  opponent_name    text not null,
  home_goals       integer,              -- null if not yet played
  away_goals       integer,
  status           text not null default 'NS',  -- 'NS' (not started), 'FT' (full time), 'LIVE', 'PST' (postponed), 'CANC'
  fetched_at       timestamptz default now(),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

comment on table public.fixtures is 'Home fixtures per team per season, cached from API-Football';


-- Visits: a user attended a specific fixture
-- This is the core user-generated data
create table public.visits (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  fixture_id   bigint not null references public.fixtures(id) on delete cascade,
  notes        text,                     -- optional: 'Great atmosphere', 'Sat behind the goal'
  rating       integer,                  -- optional: 1-5 star rating of the experience
  created_at   timestamptz default now(),

  constraint uq_user_fixture unique (user_id, fixture_id),
  constraint chk_rating check (rating is null or rating between 1 and 5)
);

comment on table public.visits is 'User attendance records — one row = "I was at this match"';


-- User Profiles: public-facing profile info (extends Supabase auth.users)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  is_public    boolean default false,    -- allow others to see your progress?
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table public.profiles is 'Public profile extending Supabase auth — controls visibility';


-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Team seasons: look up all teams for a season, or all seasons for a team
create index idx_team_seasons_season on public.team_seasons(season);
create index idx_team_seasons_team on public.team_seasons(team_id);
create index idx_team_seasons_ground on public.team_seasons(ground_id);

-- Fixtures: look up by team_season and by date
create index idx_fixtures_team_season on public.fixtures(team_season_id);
create index idx_fixtures_date on public.fixtures(match_date);
create index idx_fixtures_status on public.fixtures(status);

-- Visits: look up by user (my visits) and by fixture (who attended)
create index idx_visits_user on public.visits(user_id);
create index idx_visits_fixture on public.visits(fixture_id);


-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.grounds enable row level security;
alter table public.teams enable row level security;
alter table public.team_seasons enable row level security;
alter table public.fixtures enable row level security;
alter table public.visits enable row level security;
alter table public.profiles enable row level security;

-- ---- Reference data (grounds, teams, team_seasons, fixtures) ----
-- Everyone can read, only service_role can write (admin/cron jobs)

create policy "Anyone can read grounds"
  on public.grounds for select
  using (true);

create policy "Anyone can read teams"
  on public.teams for select
  using (true);

create policy "Anyone can read team_seasons"
  on public.team_seasons for select
  using (true);

create policy "Anyone can read fixtures"
  on public.fixtures for select
  using (true);

-- ---- Visits: users own their data ----

create policy "Users can read own visits"
  on public.visits for select
  using (auth.uid() = user_id);

create policy "Users can insert own visits"
  on public.visits for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own visits"
  on public.visits for delete
  using (auth.uid() = user_id);

create policy "Users can update own visits"
  on public.visits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- Profiles ----

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can read public profiles"
  on public.profiles for select
  using (is_public = true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Auto-create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Get a user's 48 Club progress for a given season
-- Returns each team with visit status
create or replace function public.get_progress(p_user_id uuid, p_season integer)
returns table (
  team_id       bigint,
  team_name     text,
  short_name    text,
  division      integer,
  ground_name   text,
  ground_city   text,
  latitude      double precision,
  longitude     double precision,
  visited       boolean,
  visit_date    date,
  fixture_count bigint
)
language sql
security definer
stable
as $$
  select
    t.id as team_id,
    t.name as team_name,
    t.short_name,
    ts.division,
    g.name as ground_name,
    g.city as ground_city,
    g.latitude,
    g.longitude,
    exists(
      select 1 from public.visits v
      join public.fixtures f on f.id = v.fixture_id
      where v.user_id = p_user_id
        and f.team_season_id = ts.id
    ) as visited,
    (
      select f.match_date from public.visits v
      join public.fixtures f on f.id = v.fixture_id
      where v.user_id = p_user_id
        and f.team_season_id = ts.id
      order by f.match_date desc
      limit 1
    ) as visit_date,
    (
      select count(*) from public.fixtures f
      where f.team_season_id = ts.id
    ) as fixture_count
  from public.team_seasons ts
  join public.teams t on t.id = ts.team_id
  join public.grounds g on g.id = ts.ground_id
  where ts.season = p_season
  order by ts.division, t.name;
$$;

comment on function public.get_progress is 'Returns 48 Club progress: all teams for a season with visit status';


-- Get home fixtures for a specific team/season (for the match picker)
create or replace function public.get_team_fixtures(
  p_user_id uuid,
  p_team_id bigint,
  p_season integer
)
returns table (
  fixture_id      bigint,
  round           integer,
  match_date      date,
  kickoff_time    time,
  opponent_name   text,
  home_goals      integer,
  away_goals      integer,
  status          text,
  attended        boolean,
  visit_notes     text,
  visit_rating    integer
)
language sql
security definer
stable
as $$
  select
    f.id as fixture_id,
    f.round,
    f.match_date,
    f.kickoff_time,
    f.opponent_name,
    f.home_goals,
    f.away_goals,
    f.status,
    (v.id is not null) as attended,
    v.notes as visit_notes,
    v.rating as visit_rating
  from public.team_seasons ts
  join public.fixtures f on f.team_season_id = ts.id
  left join public.visits v on v.fixture_id = f.id and v.user_id = p_user_id
  where ts.team_id = p_team_id
    and ts.season = p_season
  order by f.match_date;
$$;

comment on function public.get_team_fixtures is 'Returns home fixtures for match picker with user attendance status';


-- Leaderboard: top users by visit count for a season
create or replace function public.get_leaderboard(p_season integer, p_limit integer default 20)
returns table (
  user_id       uuid,
  display_name  text,
  avatar_url    text,
  teams_visited bigint,
  total_matches bigint
)
language sql
security definer
stable
as $$
  select
    p.id as user_id,
    p.display_name,
    p.avatar_url,
    count(distinct ts.team_id) as teams_visited,
    count(distinct v.fixture_id) as total_matches
  from public.profiles p
  join public.visits v on v.user_id = p.id
  join public.fixtures f on f.id = v.fixture_id
  join public.team_seasons ts on ts.id = f.team_season_id
  where ts.season = p_season
    and p.is_public = true
  group by p.id, p.display_name, p.avatar_url
  order by teams_visited desc, total_matches desc
  limit p_limit;
$$;

comment on function public.get_leaderboard is 'Public leaderboard ranked by unique teams visited';


-- ============================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.update_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.grounds
  for each row execute function public.update_timestamp();

create trigger set_updated_at before update on public.teams
  for each row execute function public.update_timestamp();

create trigger set_updated_at before update on public.fixtures
  for each row execute function public.update_timestamp();

create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_timestamp();


-- ============================================================
-- 6. SAMPLE SEED DATA (a few teams/grounds to get started)
-- ============================================================
-- In production you'd populate this from a migration script
-- or admin panel. This is just to show the shape of the data.

-- Grounds
insert into public.grounds (name, city, latitude, longitude, capacity, surface) values
  ('KR-völlur',           'Reykjavík',      64.1392, -21.8950, 2781,  'artificial'),
  ('Víkingsvöllur',       'Reykjavík',      64.1278, -21.8678, 3500,  'artificial'),
  ('Laugardalsvöllur',    'Reykjavík',      64.1445, -21.8737, 9800,  'artificial'),
  ('Kópavogsvöllur',      'Kópavogur',      64.1100, -21.8830, 3009,  'artificial'),
  ('Kaplakriki',          'Hafnarfjörður',   64.0680, -21.9680, 6450,  'artificial'),
  ('Hasteinsvöllur',      'Vestmannaeyjar',  63.4400, -20.2700, 3540,  'grass'),
  ('Akureyrarvöllur',     'Akureyri',       65.6760, -18.0930, 2550,  'artificial'),
  ('Gundadalsvöllur',     'Reykjavík',      64.1362, -21.8965, 1200,  'artificial'),
  ('Selfossvöllur',       'Selfoss',        63.9360, -20.9970, 1500,  'artificial'),
  ('Keflavíkurvöllur',    'Reykjanesbær',   64.0040, -22.5460, 3000,  'artificial');

-- Teams (sample — first few from each division)
insert into public.teams (name, short_name, city) values
  ('KR Reykjavík',        'KR',         'Reykjavík'),
  ('Víkingur Reykjavík',  'Víkingur R', 'Reykjavík'),
  ('Valur',               'Valur',      'Reykjavík'),
  ('Breiðablik',          'Breiðablik', 'Kópavogur'),
  ('FH Hafnarfjörður',    'FH',         'Hafnarfjörður'),
  ('ÍBV Vestmannaeyjar',  'ÍBV',        'Vestmannaeyjar'),
  ('ÍA Akureyri',         'ÍA',         'Akureyri'),
  ('Fram Reykjavík',      'Fram',       'Reykjavík'),
  ('Selfoss',             'Selfoss',    'Selfoss'),
  ('Keflavík',            'Keflavík',   'Reykjanesbær');

-- Team Seasons (sample — 2025)
-- Note: IDs are auto-generated, these reference the insert order above
insert into public.team_seasons (team_id, season, division, ground_id) values
  (1, 2025, 1, 1),   -- KR @ KR-völlur, Besta deild
  (2, 2025, 1, 2),   -- Víkingur R @ Víkingsvöllur, Besta deild
  (3, 2025, 1, 3),   -- Valur @ Laugardalsvöllur, Besta deild
  (4, 2025, 1, 4),   -- Breiðablik @ Kópavogsvöllur, Besta deild
  (5, 2025, 1, 5),   -- FH @ Kaplakriki, Besta deild
  (6, 2025, 1, 6),   -- ÍBV @ Hasteinsvöllur, Besta deild
  (7, 2025, 1, 7),   -- ÍA @ Akureyrarvöllur, Besta deild
  (8, 2025, 1, 8),   -- Fram @ Gundadalsvöllur, Besta deild
  (9, 2025, 2, 9),   -- Selfoss @ Selfossvöllur, 1. deild
  (10, 2025, 2, 10); -- Keflavík @ Keflavíkurvöllur, 1. deild


-- ============================================================
-- 7. NOTES FOR IMPLEMENTATION
-- ============================================================
--
-- API-Football fixture sync:
--   Create a Supabase Edge Function or cron job that:
--   1. Calls GET /fixtures?league={id}&season=2025 for each division
--   2. Filters to home matches only
--   3. Upserts into public.fixtures matched by api_football_id
--   4. Run daily during the season (Apr-Sep), weekly off-season
--
-- API-Football league IDs for Iceland (verify via their API):
--   Úrvalsdeild (Besta deild): 271
--   1. Deild: 272
--   2. Deild: 498
--   3. Deild: 499
--
-- Frontend calls:
--   const { data } = await supabase.rpc('get_progress', {
--     p_user_id: user.id,
--     p_season: 2025
--   });
--
--   const { data } = await supabase.rpc('get_team_fixtures', {
--     p_user_id: user.id,
--     p_team_id: 1,
--     p_season: 2025
--   });
--
-- To record a visit:
--   await supabase.from('visits').insert({
--     user_id: user.id,
--     fixture_id: 42,
--     notes: 'Great atmosphere!',
--     rating: 4
--   });
--
-- To remove a visit:
--   await supabase.from('visits').delete()
--     .eq('user_id', user.id)
--     .eq('fixture_id', 42);
--
-- Season management:
--   Each April, populate new team_seasons rows reflecting
--   promotion/relegation and any ground changes.
--   The fixtures sync will then pull the new season's matches.
-- ============================================================
