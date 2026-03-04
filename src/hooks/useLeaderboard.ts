import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../types';

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
}

export function useLeaderboard(season: number): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_leaderboard', {
        p_season: season,
        p_limit: 50,
      });

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const mapped: LeaderboardEntry[] = (data ?? []).map((row: any) => ({
        userId: row.user_id,
        displayName: row.display_name ?? 'Anonymous',
        avatarUrl: row.avatar_url ?? null,
        divisions: {
          besta: Number(row.besta_count) || 0,
          fyrsta: Number(row.fyrsta_count) || 0,
          annar: Number(row.annar_count) || 0,
          thridi: Number(row.thridi_count) || 0,
        },
        totalGrounds: Number(row.teams_visited) || 0,
        totalMatches: Number(row.total_matches) || 0,
      }));

      setEntries(mapped);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [season]);

  return { entries, loading, error };
}
