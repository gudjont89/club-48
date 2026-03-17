-- Add phase column to fixtures for league split phases, cup rounds, etc.
ALTER TABLE public.fixtures ADD COLUMN phase text NOT NULL DEFAULT 'regular_season';

-- Drop and recreate get_team_fixtures to add phase to return type
DROP FUNCTION IF EXISTS public.get_team_fixtures(uuid, bigint, integer);
CREATE OR REPLACE FUNCTION public.get_team_fixtures(
  p_user_id uuid,
  p_team_id bigint,
  p_season integer
)
RETURNS TABLE (
  fixture_id          bigint,
  round               integer,
  phase               text,
  match_date          date,
  kickoff_time        time,
  opponent_name       text,
  opponent_short_name text,
  home_goals          integer,
  away_goals          integer,
  ground_id           bigint,
  competition         text,
  status              text,
  attended            boolean,
  visit_notes         text,
  visit_rating        integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    f.id AS fixture_id,
    f.round,
    f.phase,
    f.match_date,
    f.kickoff_time,
    opp.name AS opponent_name,
    opp.short_name AS opponent_short_name,
    f.home_goals,
    f.away_goals,
    f.ground_id,
    f.competition,
    f.status,
    (v.id IS NOT NULL) AS attended,
    v.notes AS visit_notes,
    v.rating AS visit_rating
  FROM public.team_seasons ts
  JOIN public.fixtures f ON f.team_season_id = ts.id
  LEFT JOIN public.teams opp ON opp.id = f.opponent_team_id
  LEFT JOIN public.visits v ON v.fixture_id = f.id AND v.user_id = p_user_id
  WHERE ts.team_id = p_team_id
    AND ts.season = p_season
  ORDER BY f.match_date;
$$;
