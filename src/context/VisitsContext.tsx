import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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
  const [visits, setVisits] = useState<StoredVisit[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVisits(JSON.parse(stored));
      }
    } catch {
      // Start fresh
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    }
  }, [visits, loaded]);

  const attendedFixtures = new Set(visits.map(v => v.fixtureId));
  const visitedTeams = new Set(visits.map(v => v.teamId));

  const toggleAttendance = useCallback((fixtureId: number, teamId: number) => {
    setVisits(prev => {
      const exists = prev.some(v => v.fixtureId === fixtureId);
      if (exists) {
        return prev.filter(v => v.fixtureId !== fixtureId);
      }
      return [...prev, { fixtureId, teamId }];
    });
  }, []);

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
