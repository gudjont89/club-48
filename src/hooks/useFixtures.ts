import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Fixture } from '../types';

interface UseFixturesResult {
  fixtures: Fixture[];
  loading: boolean;
  error: string | null;
}

export function useFixtures(teamId: number | null, season: number): UseFixturesResult {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setFixtures([]);
      return;
    }

    let cancelled = false;

    async function fetchFixtures() {
      setLoading(true);
      setError(null);

      // First find the team_season_id
      const { data: tsData, error: tsErr } = await supabase
        .from('team_seasons')
        .select('id')
        .eq('team_id', teamId)
        .eq('season', season)
        .limit(1)
        .single();

      if (cancelled) return;

      if (tsErr || !tsData) {
        // No team_season for this team/season combo — not an error, just no data
        setFixtures([]);
        setLoading(false);
        return;
      }

      const { data, error: fErr } = await supabase
        .from('fixtures')
        .select('id, match_date, kickoff_time, opponent_team:teams!opponent_team_id(name, short_name), home_goals, away_goals, ground_id, competition_type, status')
        .eq('team_season_id', tsData.id)
        .order('match_date');

      if (cancelled) return;

      if (fErr) {
        setError(fErr.message);
        setLoading(false);
        return;
      }

      const mapped: Fixture[] = (data ?? []).map((row: any) => ({
        fixtureId: row.id,
        matchDate: row.match_date,
        kickoffTime: row.kickoff_time?.slice(0, 5) ?? null,
        opponentName: row.opponent_team?.name ?? '',
        opponentShortName: row.opponent_team?.short_name ?? '',
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
        groundId: row.ground_id ?? null,
        status: row.status,
        attended: false,
        competitionType: row.competition_type ?? 'league',
      }));

      setFixtures(mapped);
      setLoading(false);
    }

    fetchFixtures();
    return () => { cancelled = true; };
  }, [teamId, season]);

  return { fixtures, loading, error };
}
