export type DivisionId = 1 | 2 | 3 | 4;

export interface Division {
  id: DivisionId;
  name: string;
  cssKey: string;
}

export interface GroundProgress {
  teamId: number;
  teamName: string;
  shortName: string;
  division: DivisionId;
  groundName: string;
  groundCity: string;
  latitude: number;
  longitude: number;
  capacity: number;
  surface: 'artificial' | 'grass' | 'hybrid';
  teamLogoUrl: string | null;
  groundImageUrl: string | null;
  visited: boolean;
  visitDate: string | null;
  fixtureCount: number;
}

export interface Fixture {
  fixtureId: number;
  round: number | null;
  matchDate: string;
  kickoffTime: string | null;
  opponentName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'NS' | 'FT' | 'LIVE' | 'PST' | 'CANC';
  attended: boolean;
  competition: 'league' | 'cup';
}

export type MatchResult = 'W' | 'D' | 'L' | null;

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  divisions: {
    besta: number;
    fyrsta: number;
    annar: number;
    thridi: number;
  };
  totalGrounds: number;
  totalMatches: number;
}

export function getMatchResult(homeGoals: number | null, awayGoals: number | null): MatchResult {
  if (homeGoals === null || awayGoals === null) return null;
  if (homeGoals > awayGoals) return 'W';
  if (homeGoals < awayGoals) return 'L';
  return 'D';
}
