import type { Fixture } from '../types';

// Simple seeded RNG for deterministic fixture generation
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const OPPONENTS = [
  'Valur', 'Breiðablik', 'FH', 'Stjarnan', 'KR', 'Fram',
  'ÍA', 'Víkingur R', 'Fylkir', 'ÍBV', 'Keflavík',
];

const TIMES = ['14:00', '16:00', '18:00', '20:00'];

export function generateFixtures(teamShortName: string, season: number): Fixture[] {
  const seed = hashString(`${teamShortName}-${season}`);
  const rng = seededRng(seed);
  const fixtures: Fixture[] = [];
  const today = new Date();
  let fixtureId = seed % 10000;

  // Filter out the team itself from opponents
  const opps = OPPONENTS.filter(o => o !== teamShortName);

  // League: 11 home matches (April–September)
  for (let i = 0; i < 11; i++) {
    const month = 3 + Math.floor(i * 6 / 11); // April(3) to September(8), 0-indexed
    const day = 1 + Math.floor(rng() * 27);
    const date = new Date(season, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const played = date < today;

    const hg = Math.floor(rng() * 4);
    const ag = Math.floor(rng() * 3);
    const time = TIMES[Math.floor(rng() * TIMES.length)];
    const opponent = opps[i % opps.length];

    fixtures.push({
      fixtureId: fixtureId++,
      round: i * 2 + 1,
      matchDate: dateStr,
      kickoffTime: time,
      opponentName: opponent,
      homeGoals: played ? hg : null,
      awayGoals: played ? ag : null,
      status: played ? 'FT' : 'NS',
      attended: false,
      competition: 'league',
    });
  }

  // Cup: 2–4 home matches
  const numCup = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < numCup; i++) {
    const month = 4 + i; // May onwards
    const day = 10 + Math.floor(rng() * 18);
    const date = new Date(season, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const played = date < today;

    const hg = played ? Math.floor(rng() * 3) + (i < numCup - 1 ? 1 : 0) : null;
    const ag = played ? Math.floor(rng() * 2) : null;
    const opponent = opps[Math.floor(rng() * opps.length)];

    fixtures.push({
      fixtureId: fixtureId++,
      round: null,
      matchDate: dateStr,
      kickoffTime: '19:00',
      opponentName: opponent,
      homeGoals: hg,
      awayGoals: ag,
      status: played ? 'FT' : 'NS',
      attended: false,
      competition: 'cup',
    });
  }

  fixtures.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  return fixtures;
}
