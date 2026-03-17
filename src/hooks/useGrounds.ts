import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { GroundProgress, DivisionId } from '../types';

interface UseGroundsResult {
  grounds: GroundProgress[];
  loading: boolean;
  error: string | null;
}

export function useGrounds(season: number): UseGroundsResult {
  const [grounds, setGrounds] = useState<GroundProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGrounds() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('team_seasons')
        .select(`
          id,
          team_id,
          division,
          teams ( id, ksi_id, name, short_name ),
          grounds ( id, name, city, latitude, longitude, capacity, surface )
        `)
        .eq('season', season)
        .order('division');

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const mapped: GroundProgress[] = (data ?? [])
        .filter((row: any) => row.teams && row.grounds && !row.teams.name.endsWith(' W'))
        .map((row: any) => ({
          teamId: row.teams.id,
          teamName: row.teams.name,
          shortName: row.teams.short_name,
          division: row.division as DivisionId,
          groundId: row.grounds.id,
          groundName: row.grounds.name,
          groundCity: row.grounds.city,
          latitude: row.grounds.latitude ?? 0,
          longitude: row.grounds.longitude ?? 0,
          capacity: row.grounds.capacity ?? 0,
          surface: row.grounds.surface ?? 'artificial',
          teamLogoUrl: `/logos/${row.teams.ksi_id}.png`,
          groundImageUrl: null,
          visited: false,
          visitDate: null,
          fixtureCount: 0,
        }))
        .sort((a: GroundProgress, b: GroundProgress) =>
          a.division !== b.division ? a.division - b.division : a.teamName.localeCompare(b.teamName)
        );

      setGrounds(mapped);
      setLoading(false);
    }

    fetchGrounds();
    return () => { cancelled = true; };
  }, [season]);

  return { grounds, loading, error };
}

export function getGroundsByDivision(grounds: GroundProgress[]): Map<DivisionId, GroundProgress[]> {
  const map = new Map<DivisionId, GroundProgress[]>();
  for (const g of grounds) {
    const list = map.get(g.division) ?? [];
    list.push(g);
    map.set(g.division, list);
  }
  return map;
}
