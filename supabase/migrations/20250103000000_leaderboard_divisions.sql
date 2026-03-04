-- Upgrade get_leaderboard() to include per-division breakdowns.
-- Counts visits across ALL seasons, but uses the target season's divisions
-- for the breakdown (so a team's division reflects its current placement).
drop function if exists public.get_leaderboard(integer, integer);
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
    -- All unique teams a user has visited (any season)
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
    -- Join against the target season to get current division
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
