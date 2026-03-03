import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface VisitsContextValue {
  visitedTeams: Set<number>;
  attendedFixtures: Set<number>;
  toggleAttendance: (fixtureId: number, teamId: number) => void;
  isAttended: (fixtureId: number) => boolean;
  isTeamVisited: (teamId: number) => boolean;
}

const VisitsContext = createContext<VisitsContextValue | null>(null);

const STORAGE_KEY = '48club_visits_v2';

interface StoredVisit {
  fixtureId: number;
  teamId: number;
}

export function VisitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [visits, setVisits] = useState<StoredVisit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const prevUserId = useRef<string | null>(null);

  // Load visits: from Supabase when authenticated, localStorage when not
  useEffect(() => {
    const userId = user?.id ?? null;

    // Skip if user hasn't changed
    if (userId === prevUserId.current && loaded) return;
    prevUserId.current = userId;

    if (userId) {
      // Authenticated: fetch from Supabase
      fetchVisitsFromSupabase(userId);
    } else {
      // Not authenticated: load from localStorage
      loadFromLocalStorage();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchVisitsFromSupabase(userId: string) {
    const { data, error } = await supabase
      .from('visits')
      .select('fixture_id, fixtures ( team_season_id, team_seasons ( team_id ) )')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch visits:', error.message);
      loadFromLocalStorage();
      return;
    }

    const supabaseVisits: StoredVisit[] = (data ?? [])
      .filter((row: any) => row.fixtures?.team_seasons?.team_id)
      .map((row: any) => ({
        fixtureId: row.fixture_id,
        teamId: row.fixtures.team_seasons.team_id,
      }));

    // Merge any localStorage visits that aren't already in Supabase
    const localVisits = readLocalStorage();
    const supabaseFixtureIds = new Set(supabaseVisits.map(v => v.fixtureId));
    const newLocalVisits = localVisits.filter(v => !supabaseFixtureIds.has(v.fixtureId));

    if (newLocalVisits.length > 0) {
      // Upload local visits to Supabase
      const inserts = newLocalVisits.map(v => ({ user_id: userId, fixture_id: v.fixtureId }));
      await supabase.from('visits').upsert(inserts, { onConflict: 'user_id,fixture_id' });
      // Clear localStorage after merge
      localStorage.removeItem(STORAGE_KEY);
      setVisits([...supabaseVisits, ...newLocalVisits]);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setVisits(supabaseVisits);
    }

    setLoaded(true);
  }

  function loadFromLocalStorage() {
    setVisits(readLocalStorage());
    setLoaded(true);
  }

  function readLocalStorage(): StoredVisit[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Persist to localStorage only when not authenticated
  useEffect(() => {
    if (loaded && !user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    }
  }, [visits, loaded, user]);

  const attendedFixtures = new Set(visits.map(v => v.fixtureId));
  const visitedTeams = new Set(visits.map(v => v.teamId));

  const toggleAttendance = useCallback((fixtureId: number, teamId: number) => {
    setVisits(prev => {
      const exists = prev.some(v => v.fixtureId === fixtureId);
      if (exists) {
        // Remove
        if (user) {
          supabase.from('visits').delete()
            .eq('user_id', user.id)
            .eq('fixture_id', fixtureId)
            .then(({ error }) => { if (error) console.error('Delete visit failed:', error.message); });
        }
        return prev.filter(v => v.fixtureId !== fixtureId);
      } else {
        // Add
        if (user) {
          supabase.from('visits').insert({ user_id: user.id, fixture_id: fixtureId })
            .then(({ error }) => { if (error) console.error('Insert visit failed:', error.message); });
        }
        return [...prev, { fixtureId, teamId }];
      }
    });
  }, [user]);

  const isAttended = useCallback((fixtureId: number) => {
    return attendedFixtures.has(fixtureId);
  }, [attendedFixtures]);

  const isTeamVisited = useCallback((teamId: number) => {
    return visitedTeams.has(teamId);
  }, [visitedTeams]);

  return (
    <VisitsContext.Provider value={{
      visitedTeams,
      attendedFixtures,
      toggleAttendance,
      isAttended,
      isTeamVisited,
    }}>
      {children}
    </VisitsContext.Provider>
  );
}

export function useVisits() {
  const ctx = useContext(VisitsContext);
  if (!ctx) throw new Error('useVisits must be used within VisitsProvider');
  return ctx;
}
