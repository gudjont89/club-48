import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UseSeasonsResult {
  seasons: number[];
  maxSeason: number;
  minSeason: number;
  loading: boolean;
}

// Icelandic season runs Apr–Oct. In Jan–Mar, the most recent season is the previous year.
const now = new Date();
const FALLBACK_SEASON = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();

export function useSeasons(): UseSeasonsResult {
  const [seasons, setSeasons] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('team_seasons')
        .select('season');

      if (data) {
        const unique = [...new Set(data.map((r: any) => r.season as number))].sort((a, b) => a - b);
        setSeasons(unique);
      }
      setLoading(false);
    }

    fetch();
  }, []);

  return {
    seasons,
    maxSeason: seasons.length > 0 ? seasons[seasons.length - 1] : FALLBACK_SEASON,
    minSeason: seasons.length > 0 ? seasons[0] : FALLBACK_SEASON,
    loading,
  };
}
