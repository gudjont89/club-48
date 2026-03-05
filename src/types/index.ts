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
  groundId: number;
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

export type Phase =
  | 'regular_season'
  | 'championship'
  | 'relegation'
  | 'promotion_playoffs'
  | 'group_stage'
  | 'qualifying'
  | 'playoffs'
  | 'knockout'
  | 'quarter_finals'
  | 'semi_finals'
  | 'final';

export interface Fixture {
  fixtureId: number;
  round: number | null;
  phase: Phase;
  matchDate: string;
  kickoffTime: string | null;
  opponentName: string;
  opponentShortName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'NS' | 'FT' | 'LIVE' | 'PST' | 'CANC';
  groundId: number | null;
  attended: boolean;
  competition: Competition;
}

export type Competition =
  | 'league'
  | 'cup'
  | 'fotboltinet_cup'
  | 'league_cup'
  | 'super_cup'
  | 'reykjavik_cup'
  | 'champions_league'
  | 'europa_league'
  | 'conference_league';

export const COMPETITION_LABELS: Record<Competition, string> = {
  league: 'League',
  cup: 'Cup',
  fotboltinet_cup: 'Fotbolti.net Cup',
  league_cup: 'League Cup',
  super_cup: 'Super Cup',
  reykjavik_cup: 'Reykjavik Cup',
  champions_league: 'Champions League',
  europa_league: 'Europa League',
  conference_league: 'Conference League',
};

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
