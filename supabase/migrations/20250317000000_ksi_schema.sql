-- ============================================================
-- 48 KLÚBBURINN — KSÍ-based Schema
-- Replaces API-Football with ksi.is as the primary data source
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

-- Grounds: physical venues, independent of who plays there
create table public.grounds (
  id           bigint generated always as identity primary key,
  name         text not null,
  city         text,
  latitude     double precision,
  longitude    double precision,
  capacity     integer,
  surface      text default 'artificial',  -- 'artificial' | 'grass' | 'hybrid'
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table public.grounds is 'Physical football venues in Iceland';


-- Teams: the 48 clubs
create table public.teams (
  id           bigint generated always as identity primary key,
  ksi_id       integer unique not null,     -- external ID from ksi.is
  name         text not null,
  short_name   text,                        -- e.g. 'KR', 'FH', 'ÍBV'
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table public.teams is 'Icelandic football clubs tracked by the 48 Club';


-- Team Seasons: maps a team to a division and ground for a specific season
create table public.team_seasons (
  id           bigint generated always as identity primary key,
  team_id      bigint not null references public.teams(id) on delete cascade,
  season       integer not null,         -- e.g. 2025
  division     integer not null,         -- 1 = Besta deild, 2 = 1. deild, 3 = 2. deild, 4 = 3. deild
  ground_id    bigint not null references public.grounds(id) on delete restrict,
  created_at   timestamptz default now(),

  constraint uq_team_season unique (team_id, season),
  constraint chk_division check (division between 1 and 4),
  constraint chk_season check (season between 2000 and 2100)
);

comment on table public.team_seasons is 'Per-season mapping of team → division + home ground';
comment on column public.team_seasons.division is '1=Besta deild, 2=1. deild, 3=2. deild, 4=3. deild';


-- Fixtures: home matches scraped from ksi.is
create table public.fixtures (
  id                bigint generated always as identity primary key,
  ksi_match_id      integer unique,         -- external match ID from ksi.is
  team_season_id    bigint not null references public.team_seasons(id) on delete cascade,
  match_date        date not null,
  kickoff_time      time,
  opponent_team_id  bigint references public.teams(id),
  home_goals        integer,                -- null if not yet played
  away_goals        integer,
  ground_id         bigint references public.grounds(id),  -- actual venue; NULL = use team_season ground
  competition_type  text not null default 'league',  -- 'league' | 'cup' | 'preseason' | 'european'
  status            text not null default 'NS',      -- 'NS' (not started), 'FT' (full time), 'LIVE', 'PST' (postponed), 'CANC'
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

comment on table public.fixtures is 'Home fixtures per team per season, scraped from ksi.is';


-- Visits: a user attended a specific fixture
create table public.visits (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  fixture_id   bigint not null references public.fixtures(id) on delete cascade,
  notes        text,
  rating       integer,
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
  is_public    boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table public.profiles is 'Public profile extending Supabase auth — controls visibility';


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index idx_team_seasons_season on public.team_seasons(season);
create index idx_team_seasons_team on public.team_seasons(team_id);
create index idx_team_seasons_ground on public.team_seasons(ground_id);

create index idx_fixtures_team_season on public.fixtures(team_season_id);
create index idx_fixtures_ground on public.fixtures(ground_id);
create index idx_fixtures_date on public.fixtures(match_date);
create index idx_fixtures_status on public.fixtures(status);

create index idx_visits_user on public.visits(user_id);
create index idx_visits_fixture on public.visits(fixture_id);


-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.grounds enable row level security;
alter table public.teams enable row level security;
alter table public.team_seasons enable row level security;
alter table public.fixtures enable row level security;
alter table public.visits enable row level security;
alter table public.profiles enable row level security;

-- Reference data: everyone can read
create policy "Anyone can read grounds"
  on public.grounds for select using (true);

create policy "Anyone can read teams"
  on public.teams for select using (true);

create policy "Anyone can read team_seasons"
  on public.team_seasons for select using (true);

create policy "Anyone can read fixtures"
  on public.fixtures for select using (true);

-- Visits: users own their data
create policy "Users can read own visits"
  on public.visits for select using (auth.uid() = user_id);

create policy "Users can insert own visits"
  on public.visits for insert with check (auth.uid() = user_id);

create policy "Users can delete own visits"
  on public.visits for delete using (auth.uid() = user_id);

create policy "Users can update own visits"
  on public.visits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can read public profiles"
  on public.profiles for select using (is_public = true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);


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
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Get a user's 48 Club progress for a given season
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
  fixture_id          bigint,
  match_date          date,
  kickoff_time        time,
  opponent_name       text,
  opponent_short_name text,
  home_goals          integer,
  away_goals          integer,
  ground_id           bigint,
  competition_type    text,
  status              text,
  attended            boolean,
  visit_notes         text,
  visit_rating        integer
)
language sql
security definer
stable
as $$
  select
    f.id as fixture_id,
    f.match_date,
    f.kickoff_time,
    opp.name as opponent_name,
    opp.short_name as opponent_short_name,
    f.home_goals,
    f.away_goals,
    f.ground_id,
    f.competition_type,
    f.status,
    (v.id is not null) as attended,
    v.notes as visit_notes,
    v.rating as visit_rating
  from public.team_seasons ts
  join public.fixtures f on f.team_season_id = ts.id
  left join public.teams opp on opp.id = f.opponent_team_id
  left join public.visits v on v.fixture_id = f.id and v.user_id = p_user_id
  where ts.team_id = p_team_id
    and ts.season = p_season
  order by f.match_date;
$$;

comment on function public.get_team_fixtures is 'Returns home fixtures for match picker with user attendance status';


-- Leaderboard: top users by visit count for a season
create or replace function public.get_leaderboard(p_season integer, p_limit integer default 50)
returns table (
  user_id       uuid,
  display_name  text,
  avatar_url    text,
  teams_visited bigint,
  total_matches bigint,
  besta_count   bigint,
  fyrsta_count  bigint,
  annar_count   bigint,
  thridi_count  bigint
)
language sql
security definer
stable
as $$
  with visited_teams as (
    select
      v.user_id,
      ts.team_id,
      count(distinct v.fixture_id) as match_count
    from public.visits v
    join public.fixtures f on f.id = v.fixture_id
    join public.team_seasons ts on ts.id = f.team_season_id
    group by v.user_id, ts.team_id
  ),
  with_division as (
    select
      vt.user_id,
      vt.team_id,
      vt.match_count,
      cur.division
    from visited_teams vt
    join public.team_seasons cur on cur.team_id = vt.team_id and cur.season = p_season
  )
  select
    p.id as user_id,
    p.display_name,
    p.avatar_url,
    count(distinct wd.team_id) as teams_visited,
    sum(wd.match_count) as total_matches,
    count(distinct wd.team_id) filter (where wd.division = 1) as besta_count,
    count(distinct wd.team_id) filter (where wd.division = 2) as fyrsta_count,
    count(distinct wd.team_id) filter (where wd.division = 3) as annar_count,
    count(distinct wd.team_id) filter (where wd.division = 4) as thridi_count
  from public.profiles p
  join with_division wd on wd.user_id = p.id
  where p.is_public = true
  group by p.id, p.display_name, p.avatar_url
  order by teams_visited desc, total_matches desc
  limit p_limit;
$$;

comment on function public.get_leaderboard is 'Public leaderboard ranked by unique teams visited, with per-division breakdowns';


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
