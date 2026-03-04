/**
 * 48 Klúbburinn — Daily Fixture Sync
 *
 * Fetches current-season fixtures from API-Football and upserts them
 * into Supabase. Handles rescheduled matches, score updates, and
 * new fixtures that appear mid-season.
 *
 * Usage:
 *   API_FOOTBALL_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *     npx tsx scripts/sync-fixtures.ts
 *
 * Designed to run daily at midnight via cron. Uses ~10-15 API requests
 * per run (one per league + cup, current season only).
 */

import { createClient } from '@supabase/supabase-js';

// ---- Config ----

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Required env vars: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const BASE_URL = 'https://v3.football.api-sports.io';

// Icelandic season runs April–October. If we're in Jan–March, sync the previous year.
const now = new Date();
const CURRENT_SEASON = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();

// League IDs confirmed from API-Football
const LEAGUES = [
  { id: 164, name: 'Úrvalsdeild', division: 1, competition: 'league' },
  { id: 165, name: '1. Deild', division: 2, competition: 'league' },
  { id: 166, name: '2. Deild', division: 3, competition: 'league' },
  { id: 167, name: 'Cup', division: 0, competition: 'cup' },
  { id: 168, name: 'League Cup', division: 0, competition: 'league_cup' },
  // European competitions — only home fixtures for tracked teams will be stored
  { id: 2, name: 'Champions League', division: 0, competition: 'champions_league' },
  { id: 3, name: 'Europa League', division: 0, competition: 'europa_league' },
  { id: 848, name: 'Conference League', division: 0, competition: 'conference_league' },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let requestCount = 0;

// ---- API helpers ----

interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string }; venue: { id: number | null; name: string | null } | null };
  league: { id: number; season: number; round: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
}

async function apiFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  requestCount++;
  console.log(`  [${requestCount}] GET ${endpoint} ${JSON.stringify(params)}`);

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY! },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json() as { response: T; errors: Record<string, string> };

  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  }

  // Rate limit courtesy delay
  await new Promise(r => setTimeout(r, 1200));

  return json.response;
}

function mapStatus(apiStatus: string): string {
  if (['FT', 'AET', 'PEN'].includes(apiStatus)) return 'FT';
  if (['LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(apiStatus)) return 'LIVE';
  if (['PST', 'SUSP', 'INT'].includes(apiStatus)) return 'PST';
  if (['CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) return 'CANC';
  return 'NS';
}

// ---- Main ----

async function main() {
  console.log(`=== Fixture Sync — ${new Date().toISOString()} ===`);
  console.log(`Season: ${CURRENT_SEASON}\n`);

  // Step 1: Load team mapping from Supabase
  // teams.api_football_id → teams.id
  const { data: teams, error: tError } = await supabase
    .from('teams')
    .select('id, api_football_id');

  if (tError) {
    console.error('Failed to load teams:', tError.message);
    process.exit(1);
  }

  const apiIdToTeamId = new Map<number, number>();
  for (const t of teams ?? []) {
    if (t.api_football_id) apiIdToTeamId.set(t.api_football_id, t.id);
  }
  console.log(`Loaded ${apiIdToTeamId.size} teams`);

  // venue API ID → ground ID mapping
  const { data: grounds, error: gError } = await supabase
    .from('grounds')
    .select('id, notes');

  if (gError) {
    console.error('Failed to load grounds:', gError.message);
    process.exit(1);
  }

  const venueApiIdToGroundId = new Map<number, number>();
  for (const g of grounds ?? []) {
    const match = g.notes?.match(/api_football_venue_id: (\d+)/);
    if (match) {
      venueApiIdToGroundId.set(Number(match[1]), g.id);
      // Also map aliases to this ground
      const aliasMatch = g.notes?.match(/aliases: ([\d,]+)/);
      if (aliasMatch) {
        for (const alias of aliasMatch[1].split(',')) {
          venueApiIdToGroundId.set(Number(alias), g.id);
        }
      }
    }
  }
  console.log(`Loaded ${venueApiIdToGroundId.size} venue→ground mappings`);

  // team_id → team_season_id for current season
  const { data: teamSeasons, error: tsError } = await supabase
    .from('team_seasons')
    .select('id, team_id')
    .eq('season', CURRENT_SEASON);

  if (tsError) {
    console.error('Failed to load team_seasons:', tsError.message);
    process.exit(1);
  }

  const teamIdToTeamSeasonId = new Map<number, number>();
  for (const ts of teamSeasons ?? []) {
    teamIdToTeamSeasonId.set(ts.team_id, ts.id);
  }
  console.log(`Loaded ${teamSeasons?.length ?? 0} team_seasons for ${CURRENT_SEASON}\n`);

  // Step 2: Fetch fixtures from API-Football
  let totalUpserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const league of LEAGUES) {
    console.log(`Fetching ${league.name} (${CURRENT_SEASON})...`);

    let fixtures: ApiFixture[];
    try {
      fixtures = await apiFetch<ApiFixture[]>('/fixtures', {
        league: league.id,
        season: CURRENT_SEASON,
      });
    } catch (e) {
      console.log(`  Skipped: ${(e as Error).message}`);
      continue;
    }

    console.log(`  ${fixtures.length} total fixtures returned`);

    // Process home fixtures only
    const homeFixtures = fixtures.filter(f => {
      const ourTeamId = apiIdToTeamId.get(f.teams.home.id);
      return ourTeamId !== undefined && teamIdToTeamSeasonId.has(ourTeamId);
    });

    console.log(`  ${homeFixtures.length} home fixtures for tracked teams`);

    for (const f of homeFixtures) {
      const ourTeamId = apiIdToTeamId.get(f.teams.home.id)!;
      const teamSeasonId = teamIdToTeamSeasonId.get(ourTeamId);
      const opponentTeamId = apiIdToTeamId.get(f.teams.away.id) ?? null;

      if (!teamSeasonId) {
        totalSkipped++;
        continue;
      }

      const date = new Date(f.fixture.date);
      const matchDate = date.toISOString().split('T')[0];
      const kickoffTime = date.toTimeString().slice(0, 5);
      const roundMatch = f.league.round.match(/(\d+)/);
      const round = roundMatch ? parseInt(roundMatch[1]) : null;

      const venueId = f.fixture.venue?.id ?? null;
      const groundId = venueId ? venueApiIdToGroundId.get(venueId) ?? null : null;

      const row = {
        api_football_id: f.fixture.id,
        team_season_id: teamSeasonId,
        ground_id: groundId,
        round,
        match_date: matchDate,
        kickoff_time: kickoffTime,
        opponent_team_id: opponentTeamId,
        home_goals: f.goals.home,
        away_goals: f.goals.away,
        competition: league.competition,
        status: mapStatus(f.fixture.status.short),
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fixtures')
        .upsert(row, { onConflict: 'api_football_id' });

      if (error) {
        console.log(`    Error upserting fixture ${f.fixture.id}: ${error.message}`);
        totalErrors++;
      } else {
        totalUpserted++;
      }
    }
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`  Upserted: ${totalUpserted}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  API requests: ${requestCount}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
