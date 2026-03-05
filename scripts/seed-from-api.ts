/**
 * 48 Klúbburinn — API-Football Seed Script
 *
 * Fetches real data from API-Football (api-sports.io) and outputs
 * SQL seed files for the Supabase database.
 *
 * Usage:
 *   API_FOOTBALL_KEY=your_key npx tsx scripts/seed-from-api.ts
 *
 * Rate limits: ~100 req/day on free tier. This script makes roughly
 * 60-80 requests depending on seasons. Paid tier ($19/mo) has 100/day
 * which is sufficient for a single run.
 *
 * Output: supabase/seed.sql (overwrites existing)
 *
 * Name overrides:
 *   scripts/overrides/teams.tsv   — api_id<TAB>name<TAB>short_name
 *   scripts/overrides/grounds.tsv — api_venue_id<TAB>name
 */

const API_KEY = process.env.API_FOOTBALL_KEY;
if (!API_KEY) {
  console.error('ERROR: Set API_FOOTBALL_KEY environment variable');
  process.exit(1);
}

const BASE_URL = 'https://v3.football.api-sports.io';
const SEASONS = [2020, 2021, 2022, 2023, 2024, 2025];
const OUTPUT_FILE = 'supabase/seed.sql';

// ---- Load name overrides ----

interface TeamOverride { name: string; shortName: string }
interface GroundOverride { name: string }

async function loadOverrides() {
  const { readFileSync, existsSync } = await import('fs');
  const teamOverrides = new Map<number, TeamOverride>();
  const groundOverrides = new Map<number, GroundOverride>();

  const teamsFile = 'scripts/overrides/teams.tsv';
  if (existsSync(teamsFile)) {
    for (const line of readFileSync(teamsFile, 'utf-8').split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [id, name, shortName] = line.split('\t');
      if (id && name && shortName) {
        teamOverrides.set(Number(id), { name: name.trim(), shortName: shortName.trim() });
      }
    }
    console.log(`  Loaded ${teamOverrides.size} team name overrides`);
  }

  const groundsFile = 'scripts/overrides/grounds.tsv';
  if (existsSync(groundsFile)) {
    for (const line of readFileSync(groundsFile, 'utf-8').split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [id, name] = line.split('\t');
      if (id && name) {
        groundOverrides.set(Number(id), { name: name.trim() });
      }
    }
    console.log(`  Loaded ${groundOverrides.size} ground name overrides`);
  }

  // Ground aliases: alias venue ID → canonical venue ID
  const groundAliases = new Map<number, number>();
  const aliasesFile = 'scripts/overrides/ground-aliases.tsv';
  if (existsSync(aliasesFile)) {
    for (const line of readFileSync(aliasesFile, 'utf-8').split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [aliasId, canonicalId] = line.split('\t');
      if (aliasId && canonicalId) {
        groundAliases.set(Number(aliasId.trim()), Number(canonicalId.trim()));
      }
    }
    console.log(`  Loaded ${groundAliases.size} ground aliases`);
  }

  // Ground image URL overrides: venue ID → custom image URL
  const groundImageOverrides = new Map<number, string>();
  const imagesFile = 'scripts/overrides/ground-images.tsv';
  if (existsSync(imagesFile)) {
    for (const line of readFileSync(imagesFile, 'utf-8').split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [id, url] = line.split('\t');
      if (id && url) {
        groundImageOverrides.set(Number(id.trim()), url.trim());
      }
    }
    console.log(`  Loaded ${groundImageOverrides.size} ground image overrides`);
  }

  return { teamOverrides, groundOverrides, groundAliases, groundImageOverrides };
}

// Rate limit tracking
let requestCount = 0;

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

  // Respect rate limits — small delay between requests
  await new Promise(r => setTimeout(r, 1200));

  return json.response;
}

// ---- Types for API responses ----

interface ApiLeague {
  league: { id: number; name: string; type: string };
  country: { name: string };
  seasons: { year: number }[];
}

interface ApiTeam {
  team: { id: number; name: string; code: string | null; logo: string };
  venue: { id: number | null; name: string | null; city: string | null; capacity: number | null; surface: string | null };
}

interface ApiVenue {
  id: number;
  name: string;
  city: string;
  capacity: number | null;
  surface: string | null;
  address: string | null;
}

interface ApiFixture {
  fixture: { id: number; date: string; timestamp: number; status: { short: string }; venue: { id: number | null; name: string | null } | null };
  league: { id: number; season: number; round: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
}

// ---- Data collection ----

interface Ground {
  apiFootballVenueId: number | null;
  name: string;
  city: string;
  capacity: number | null;
  surface: string;
  latitude: number | null;
  longitude: number | null;
}

interface Team {
  apiFootballId: number;
  name: string;
  shortName: string;
  logoUrl: string;
  city: string;
  venueId: number | null;
  venueName: string | null;
}

interface TeamSeason {
  teamApiId: number;
  season: number;
  division: number;
  venueApiId: number | null;
}

interface Fixture {
  apiFootballId: number;
  teamApiId: number; // home team
  opponentApiId: number; // away team
  season: number;
  leagueApiId: number;
  round: string;
  phase: string;
  matchDate: string;
  kickoffTime: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  venueApiId: number | null; // actual venue where match was played
}

// Parse API-Football round string into a phase enum value
function parsePhase(roundStr: string): string {
  if (roundStr.startsWith('Regular Season')) return 'regular_season';
  if (roundStr.startsWith('Championship Round')) return 'championship';
  if (roundStr.startsWith('Relegation Round')) return 'relegation';
  if (roundStr.startsWith('Promotion Play-offs')) return 'promotion_playoffs';
  if (roundStr.startsWith('Group Stage') || /^Group [A-Z\d]/.test(roundStr)) return 'group_stage';
  if (roundStr.includes('Qualifying Round')) return 'qualifying';
  if (roundStr.includes('Play-offs') || roundStr.includes('Playoff round') || roundStr.includes('Knockout Round')) return 'playoffs';
  if (roundStr === 'Quarter-finals') return 'quarter_finals';
  if (roundStr === 'Semi-finals') return 'semi_finals';
  if (/Round of \d+/.test(roundStr) || /\d+(st|nd|rd|th) Finals/.test(roundStr)) return 'knockout';
  if (roundStr.includes('Final')) return 'final';
  return 'regular_season';
}

// ---- Main ----

async function main() {
  console.log('=== 48 Klúbburinn — API-Football Seed Script ===\n');

  // Load name overrides from TSV files
  const { teamOverrides, groundOverrides, groundAliases, groundImageOverrides } = await loadOverrides();

  // Helper: resolve venue ID through aliases to canonical ID
  function resolveVenue(venueId: number | null): number | null {
    if (venueId === null) return null;
    return groundAliases.get(venueId) ?? venueId;
  }

  // Step 1: Discover Icelandic leagues
  console.log('Step 1: Discovering Icelandic leagues...');
  const leagues = await apiFetch<ApiLeague[]>('/leagues', { country: 'Iceland' });

  console.log(`  Found ${leagues.length} leagues:`);
  for (const l of leagues) {
    console.log(`    ${l.league.id}: ${l.league.name} (${l.league.type})`);
  }

  // Identify the leagues we care about
  // These are the known Icelandic league names — match by name since IDs can vary
  // competition: stored in fixtures to distinguish league from cup matches
  const leagueMatchers: { division: number; competition: string; patterns: string[] }[] = [
    { division: 1, competition: 'league', patterns: ['úrvalsdeild', 'besta deild', 'premier league'] },
    { division: 2, competition: 'league', patterns: ['1. deild', 'first division', '1 deild'] },
    { division: 3, competition: 'league', patterns: ['2. deild', 'second division', '2 deild'] },
    { division: 0, competition: 'league_cup', patterns: ['league cup', 'deildabikar'] },
    { division: 0, competition: 'super_cup', patterns: ['super cup'] },
    { division: 0, competition: 'reykjavik_cup', patterns: ['reykjavik cup'] },
    { division: 0, competition: 'fotboltinet_cup', patterns: ['fotbolti.net'] },
    { division: 0, competition: 'cup', patterns: ['cup', 'bikar', 'borgunarbikar'] }, // Catch-all cup last
  ];

  const leagueMap = new Map<number, { apiId: number; name: string; division: number; competition: string }>();

  for (const l of leagues) {
    const nameLower = l.league.name.toLowerCase();
    for (const matcher of leagueMatchers) {
      if (matcher.patterns.some(p => nameLower.includes(p))) {
        leagueMap.set(l.league.id, {
          apiId: l.league.id,
          name: l.league.name,
          division: matcher.division,
          competition: matcher.competition,
        });
        console.log(`  ✓ Matched: ${l.league.name} (ID ${l.league.id}) → ${matcher.competition}`);
        break;
      }
    }
  }

  const divisionLeagues = [...leagueMap.values()].filter(l => l.division >= 1);
  const cupLeagues = [...leagueMap.values()].filter(l => l.division === 0);

  if (divisionLeagues.length === 0) {
    console.error('ERROR: Could not find any Icelandic league divisions');
    process.exit(1);
  }

  // Step 2: Fetch teams for each league + season
  console.log('\nStep 2: Fetching teams per league/season...');
  const allTeams = new Map<number, Team>(); // keyed by API team ID
  const allTeamSeasons: TeamSeason[] = [];
  const teamVenueMap = new Map<number, number | null>(); // team API ID → venue API ID

  for (const league of divisionLeagues) {
    for (const season of SEASONS) {
      console.log(`  ${league.name} / ${season}...`);
      try {
        const teams = await apiFetch<ApiTeam[]>('/teams', {
          league: league.apiId,
          season,
        });

        for (const t of teams) {
          if (!allTeams.has(t.team.id)) {
            allTeams.set(t.team.id, {
              apiFootballId: t.team.id,
              name: t.team.name,
              shortName: t.team.code ?? t.team.name.slice(0, 3).toUpperCase(),
              logoUrl: t.team.logo,
              city: t.venue?.city ?? '',
              venueId: t.venue?.id ?? null,
              venueName: t.venue?.name ?? null,
            });
          }
          teamVenueMap.set(t.team.id, t.venue?.id ?? null);

          allTeamSeasons.push({
            teamApiId: t.team.id,
            season,
            division: league.division,
            venueApiId: t.venue?.id ?? null,
          });
        }
      } catch (e) {
        console.log(`    ⚠ Skipped (${(e as Error).message})`);
      }
    }
  }

  // Step 3: Fetch cup teams to discover 3. deild clubs
  if (cupLeagues.length > 0) {
    console.log('\nStep 3: Fetching cup teams for 3. deild discovery...');
    const cupTeamIds = new Set<number>();

    for (const cupLeague of cupLeagues) {
      for (const season of SEASONS) {
        console.log(`  ${cupLeague.name} / ${season}...`);
        try {
          const teams = await apiFetch<ApiTeam[]>('/teams', {
            league: cupLeague.apiId,
            season,
          });

          for (const t of teams) {
            if (!allTeams.has(t.team.id)) {
              // This team wasn't in divisions 1-3, so it's likely 3. deild or lower
              allTeams.set(t.team.id, {
                apiFootballId: t.team.id,
                name: t.team.name,
                shortName: t.team.code ?? t.team.name.slice(0, 3).toUpperCase(),
                logoUrl: t.team.logo,
                city: t.venue?.city ?? '',
                venueId: t.venue?.id ?? null,
                venueName: t.venue?.name ?? null,
              });
              cupTeamIds.add(t.team.id);
              teamVenueMap.set(t.team.id, t.venue?.id ?? null);
            }
          }
        } catch (e) {
          console.log(`    ⚠ Skipped (${(e as Error).message})`);
        }
      }
    }

    console.log(`  Found ${cupTeamIds.size} additional teams from cup data`);
  } else {
    console.log('\nStep 3: No cup leagues found, skipping 3. deild discovery');
  }

  // Step 4: Fetch venue details — include ALL Icelandic venues
  console.log('\nStep 4: Fetching venue details...');
  const allGrounds = new Map<number, Ground>(); // keyed by canonical venue API ID

  // Resolve team venue IDs through aliases
  for (const [teamId, venueId] of teamVenueMap) {
    if (venueId) {
      const resolved = resolveVenue(venueId);
      if (resolved !== venueId) teamVenueMap.set(teamId, resolved);
    }
  }

  // Fetch ALL venues by country (not just team home venues)
  try {
    const venues = await apiFetch<ApiVenue[]>('/venues', { country: 'Iceland' });
    for (const v of venues) {
      // Skip alias venues — they'll resolve to their canonical ground
      if (groundAliases.has(v.id)) continue;

      allGrounds.set(v.id, {
        apiFootballVenueId: v.id,
        name: v.name,
        city: v.city,
        capacity: v.capacity,
        surface: v.surface?.toLowerCase().includes('grass') ? 'grass'
          : v.surface?.toLowerCase().includes('artif') ? 'artificial'
          : 'artificial',
        latitude: null,
        longitude: null,
      });
    }
    console.log(`  Found ${allGrounds.size} venues from API (${groundAliases.size} aliases excluded)`);
  } catch (e) {
    console.log(`  ⚠ Venue fetch failed: ${(e as Error).message}`);
  }

  // For team venues not found via country search, create from team data
  for (const [teamId, venueId] of teamVenueMap) {
    if (venueId && !allGrounds.has(venueId)) {
      const team = allTeams.get(teamId);
      if (team && team.venueName) {
        allGrounds.set(venueId, {
          apiFootballVenueId: venueId,
          name: team.venueName,
          city: team.city,
          capacity: null,
          surface: 'artificial',
          latitude: null,
          longitude: null,
        });
      }
    }
  }

  // Step 5: Fetch fixtures
  console.log('\nStep 5: Fetching fixtures...');
  const allFixtures: Fixture[] = [];

  for (const league of divisionLeagues) {
    for (const season of SEASONS) {
      console.log(`  ${league.name} / ${season}...`);
      try {
        const fixtures = await apiFetch<ApiFixture[]>('/fixtures', {
          league: league.apiId,
          season,
        });

        for (const f of fixtures) {
          // We only want HOME fixtures for each team
          const homeTeamId = f.teams.home.id;
          if (!allTeams.has(homeTeamId)) continue;

          // Parse round number from "Regular Season - 1" etc.
          const roundMatch = f.league.round.match(/(\d+)/);
          const roundNum = roundMatch ? roundMatch[1] : null;

          const date = new Date(f.fixture.date);
          const matchDate = date.toISOString().split('T')[0];
          const kickoffTime = date.toTimeString().slice(0, 5);

          // Map API status to our status
          let status = 'NS';
          const apiStatus = f.fixture.status.short;
          if (['FT', 'AET', 'PEN'].includes(apiStatus)) status = 'FT';
          else if (['LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(apiStatus)) status = 'LIVE';
          else if (['PST', 'SUSP', 'INT'].includes(apiStatus)) status = 'PST';
          else if (['CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) status = 'CANC';

          allFixtures.push({
            apiFootballId: f.fixture.id,
            teamApiId: homeTeamId,
            opponentApiId: f.teams.away.id,
            season,
            leagueApiId: league.apiId,
            round: roundNum ?? f.league.round,
            phase: parsePhase(f.league.round),
            matchDate,
            kickoffTime,
            homeGoals: f.goals.home,
            awayGoals: f.goals.away,
            status,
            venueApiId: f.fixture.venue?.id ?? null,
          });
        }
      } catch (e) {
        console.log(`    ⚠ Skipped (${(e as Error).message})`);
      }
    }
  }

  console.log(`  Total home fixtures: ${allFixtures.length}`);

  // Step 6: Also fetch cup fixtures
  if (cupLeagues.length > 0) {
    console.log('\nStep 5b: Fetching cup fixtures...');
    for (const cupLeague of cupLeagues) {
      for (const season of SEASONS) {
        console.log(`  ${cupLeague.name} / ${season}...`);
        try {
          const fixtures = await apiFetch<ApiFixture[]>('/fixtures', {
            league: cupLeague.apiId,
            season,
          });

          for (const f of fixtures) {
            const homeTeamId = f.teams.home.id;
            if (!allTeams.has(homeTeamId)) continue;

            const date = new Date(f.fixture.date);
            const matchDate = date.toISOString().split('T')[0];
            const kickoffTime = date.toTimeString().slice(0, 5);

            let status = 'NS';
            const apiStatus = f.fixture.status.short;
            if (['FT', 'AET', 'PEN'].includes(apiStatus)) status = 'FT';
            else if (['LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(apiStatus)) status = 'LIVE';
            else if (['PST', 'SUSP', 'INT'].includes(apiStatus)) status = 'PST';
            else if (['CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) status = 'CANC';

            allFixtures.push({
              apiFootballId: f.fixture.id,
              teamApiId: homeTeamId,
              opponentApiId: f.teams.away.id,
              season,
              leagueApiId: cupLeague.apiId,
              round: f.league.round,
              phase: parsePhase(f.league.round),
              matchDate,
              kickoffTime,
              homeGoals: f.goals.home,
              awayGoals: f.goals.away,
              status,
              venueApiId: f.fixture.venue?.id ?? null,
            });
          }
        } catch (e) {
          console.log(`    ⚠ Skipped (${(e as Error).message})`);
        }
      }
    }
  }

  // Step 5c: Fetch European competition fixtures (home matches by Icelandic teams)
  // These are global competitions — we fetch all fixtures and filter for our tracked teams
  const EUROPEAN_COMPETITIONS = [
    { id: 2, competition: 'champions_league', name: 'Champions League' },
    { id: 3, competition: 'europa_league', name: 'Europa League' },
    { id: 848, competition: 'conference_league', name: 'Conference League' },
  ];

  console.log('\nStep 5c: Fetching European competition fixtures...');
  let euroFixtures = 0;

  for (const euro of EUROPEAN_COMPETITIONS) {
    for (const season of SEASONS) {
      console.log(`  ${euro.name} / ${season}...`);
      try {
        const fixtures = await apiFetch<ApiFixture[]>('/fixtures', {
          league: euro.id,
          season,
        });

        for (const f of fixtures) {
          const homeTeamId = f.teams.home.id;
          if (!allTeams.has(homeTeamId)) continue; // Not an Icelandic team

          // Add the foreign opponent to allTeams if not already known
          const awayTeamId = f.teams.away.id;
          if (!allTeams.has(awayTeamId)) {
            allTeams.set(awayTeamId, {
              apiFootballId: awayTeamId,
              name: f.teams.away.name,
              shortName: f.teams.away.name.slice(0, 3).toUpperCase(),
              logoUrl: `https://media.api-sports.io/football/teams/${awayTeamId}.png`,
              city: '',
              venueId: null,
              venueName: null,
            });
          }

          const date = new Date(f.fixture.date);
          const matchDate = date.toISOString().split('T')[0];
          const kickoffTime = date.toTimeString().slice(0, 5);

          let status = 'NS';
          const apiStatus = f.fixture.status.short;
          if (['FT', 'AET', 'PEN'].includes(apiStatus)) status = 'FT';
          else if (['LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(apiStatus)) status = 'LIVE';
          else if (['PST', 'SUSP', 'INT'].includes(apiStatus)) status = 'PST';
          else if (['CANC', 'ABD', 'AWD', 'WO'].includes(apiStatus)) status = 'CANC';

          // Add to leagueMap so fixture generation picks up the competition
          if (!leagueMap.has(euro.id)) {
            leagueMap.set(euro.id, {
              apiId: euro.id,
              name: euro.name,
              division: 0,
              competition: euro.competition,
            });
          }

          allFixtures.push({
            apiFootballId: f.fixture.id,
            teamApiId: homeTeamId,
            opponentApiId: awayTeamId,
            season,
            leagueApiId: euro.id,
            round: f.league.round,
            phase: parsePhase(f.league.round),
            matchDate,
            kickoffTime,
            homeGoals: f.goals.home,
            awayGoals: f.goals.away,
            status,
            venueApiId: f.fixture.venue?.id ?? null,
          });
          euroFixtures++;
        }
      } catch (e) {
        console.log(`    ⚠ Skipped (${(e as Error).message})`);
      }
    }
  }

  console.log(`  ${euroFixtures} European home fixtures for Icelandic teams`);

  // Step 5d: Load 3. deild fixtures from ksi.is scraper data
  // 3. deild is not covered by API-Football as a league, so we scrape from ksi.is
  // Run `npx tsx scripts/scrape-ksi.ts` first to generate ksi-data.json
  const { existsSync: ksiExists, readFileSync: ksiRead } = await import('fs');
  const ksiDataFile = 'scripts/ksi-data.json';
  if (ksiExists(ksiDataFile)) {
    console.log('\nStep 5d: Loading 3. deild fixtures from ksi-data.json...');
    const ksiData = JSON.parse(ksiRead(ksiDataFile, 'utf-8'));

    // Add team_seasons for 3. deild
    for (const ts of ksiData.teamSeasons) {
      allTeamSeasons.push({
        teamApiId: ts.apiTeamId,
        season: ts.season,
        division: ts.division,
        venueApiId: ts.homeGroundApiId,
      });
    }

    // Add fixtures with synthetic api_football_id (900000+)
    let ksiFixtureCount = 0;
    const KSI_ID_OFFSET = 900000;
    for (let i = 0; i < ksiData.fixtures.length; i++) {
      const f = ksiData.fixtures[i];
      allFixtures.push({
        apiFootballId: KSI_ID_OFFSET + i,
        teamApiId: f.homeTeamApiId,
        opponentApiId: f.awayTeamApiId,
        season: f.season,
        leagueApiId: 0, // no API-Football league ID for 3. deild
        round: '',
        phase: 'regular_season',
        matchDate: f.matchDate,
        kickoffTime: f.kickoffTime,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        status: f.status,
        venueApiId: f.venueApiId,
      });
      ksiFixtureCount++;
    }

    // Ensure leagueMap has an entry for ksi fixtures (leagueApiId=0)
    if (!leagueMap.has(0)) {
      leagueMap.set(0, { apiId: 0, name: '3. deild (ksi.is)', division: 4, competition: 'league' });
    }

    console.log(`  ${ksiData.teamSeasons.length} team_seasons, ${ksiFixtureCount} fixtures from ksi.is`);
  } else {
    console.log('\nStep 5d: No ksi-data.json found, skipping 3. deild');
  }

  // Diagnostic: report fixture venues that won't resolve to a ground
  const unresolvedVenues = new Map<number, { name: string; count: number }>();
  for (const fix of allFixtures) {
    if (!fix.venueApiId) continue;
    const resolved = resolveVenue(fix.venueApiId);
    if (resolved && !allGrounds.has(resolved)) {
      const entry = unresolvedVenues.get(fix.venueApiId) ?? { name: '?', count: 0 };
      entry.count++;
      unresolvedVenues.set(fix.venueApiId, entry);
    }
  }
  if (unresolvedVenues.size > 0) {
    console.log(`\n⚠ ${unresolvedVenues.size} fixture venue IDs not in grounds table:`);
    for (const [venueId, info] of [...unresolvedVenues.entries()].sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  Venue ${venueId} — ${info.count} fixtures`);
    }
  }

  // ---- Step 6: Generate SQL ----
  console.log('\nStep 6: Generating SQL...');

  const sql: string[] = [];
  sql.push('-- ============================================================');
  sql.push('-- SEED DATA — Generated from API-Football');
  sql.push(`-- Generated: ${new Date().toISOString()}`);
  sql.push(`-- Seasons: ${SEASONS.join(', ')}`);
  sql.push(`-- API requests made: ${requestCount}`);
  sql.push('-- ============================================================');
  sql.push('');
  sql.push('TRUNCATE public.team_seasons, public.fixtures, public.visits, public.teams, public.grounds RESTART IDENTITY CASCADE;');
  sql.push('');

  // Grounds — assign sequential IDs
  const groundIdMap = new Map<number, number>(); // venue API ID → our ground ID
  let groundId = 1;

  sql.push('-- ============================================================');
  sql.push('-- GROUNDS');
  sql.push('-- ============================================================');

  // Sort grounds by name for consistent output
  const sortedGrounds = [...allGrounds.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  for (const [venueApiId, ground] of sortedGrounds) {
    groundIdMap.set(venueApiId, groundId);
    const gOverride = groundOverrides.get(venueApiId);
    const groundName = gOverride?.name ?? ground.name;
    const imageUrl = groundImageOverrides.get(venueApiId) ?? `https://media.api-sports.io/football/venues/${venueApiId}.png`;
    // Collect aliases that point to this venue
    const aliases = [...groundAliases.entries()]
      .filter(([, canonical]) => canonical === venueApiId)
      .map(([alias]) => alias);
    const noteParts = [`api_football_venue_id: ${venueApiId}`];
    if (aliases.length > 0) noteParts.push(`aliases: ${aliases.join(',')}`);
    sql.push(`INSERT INTO public.grounds (name, city, capacity, surface, image_url, notes) VALUES (${esc(groundName)}, ${esc(ground.city)}, ${ground.capacity ?? 'NULL'}, ${esc(ground.surface)}, ${esc(imageUrl)}, ${esc(noteParts.join('; '))});`);
    groundId++;
  }

  // Map alias venue IDs to the same ground DB IDs
  for (const [aliasId, canonicalId] of groundAliases) {
    const gid = groundIdMap.get(canonicalId);
    if (gid) groundIdMap.set(aliasId, gid);
  }

  sql.push('');

  // Teams — assign sequential IDs
  const teamIdMap = new Map<number, number>(); // team API ID → our team ID
  let teamId = 1;

  sql.push('-- ============================================================');
  sql.push('-- TEAMS');
  sql.push('-- ============================================================');

  const sortedTeams = [...allTeams.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  for (const [apiId, team] of sortedTeams) {
    teamIdMap.set(apiId, teamId);
    const tOverride = teamOverrides.get(apiId);
    const teamName = tOverride?.name ?? team.name;
    const shortName = tOverride?.shortName ?? team.shortName;
    sql.push(`INSERT INTO public.teams (api_football_id, name, short_name, logo_url, city) VALUES (${apiId}, ${esc(teamName)}, ${esc(shortName)}, ${esc(team.logoUrl)}, ${esc(team.city)});`);
    teamId++;
  }

  sql.push('');

  // Team seasons
  sql.push('-- ============================================================');
  sql.push('-- TEAM_SEASONS');
  sql.push('-- ============================================================');

  // Deduplicate — a team can appear in both league and cup for the same season
  const seenTeamSeasons = new Set<string>();
  const uniqueTeamSeasons = allTeamSeasons.filter(ts => {
    const key = `${ts.teamApiId}-${ts.season}`;
    if (seenTeamSeasons.has(key)) return false;
    seenTeamSeasons.add(key);
    return true;
  });

  // Sort by season, then division, then team name
  uniqueTeamSeasons.sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    if (a.division !== b.division) return a.division - b.division;
    const nameA = allTeams.get(a.teamApiId)?.name ?? '';
    const nameB = allTeams.get(b.teamApiId)?.name ?? '';
    return nameA.localeCompare(nameB);
  });

  for (const ts of uniqueTeamSeasons) {
    const ourTeamId = teamIdMap.get(ts.teamApiId);
    const ourGroundId = ts.venueApiId ? groundIdMap.get(ts.venueApiId) : null;

    if (!ourTeamId) continue;
    if (!ourGroundId) {
      sql.push(`-- WARNING: No ground found for team ${allTeams.get(ts.teamApiId)?.name} (API ID ${ts.teamApiId}) in ${ts.season}`);
      continue;
    }

    sql.push(`INSERT INTO public.team_seasons (team_id, season, division, ground_id) VALUES (${ourTeamId}, ${ts.season}, ${ts.division}, ${ourGroundId});`);
  }

  sql.push('');

  // Fixtures
  sql.push('-- ============================================================');
  sql.push('-- FIXTURES');
  sql.push('-- ============================================================');

  // We need to reference team_season IDs. Since we're using IDENTITY, we need to look them up.
  // Instead, let's use a subquery approach.

  // Sort fixtures by date
  allFixtures.sort((a, b) => a.matchDate.localeCompare(b.matchDate) || a.apiFootballId - b.apiFootballId);

  // Deduplicate by API Football ID
  const seenFixtures = new Set<number>();

  for (const fix of allFixtures) {
    if (seenFixtures.has(fix.apiFootballId)) continue;
    seenFixtures.add(fix.apiFootballId);

    const ourTeamId = teamIdMap.get(fix.teamApiId);
    if (!ourTeamId) continue;

    // Parse round number
    const roundMatch = fix.round.match(/(\d+)/);
    const roundVal = roundMatch ? roundMatch[1] : 'NULL';

    // Use INSERT...SELECT to gracefully skip rows where team_season doesn't exist
    // opponent_team_id is resolved via subquery on api_football_id
    // ground_id is set when the fixture venue differs from team's home ground (or always when known)
    const competition = leagueMap.get(fix.leagueApiId)?.competition ?? 'league';
    const fixtureGroundId = fix.venueApiId ? groundIdMap.get(fix.venueApiId) ?? null : null;
    const groundIdExpr = fixtureGroundId !== null ? String(fixtureGroundId) : 'NULL';
    sql.push(`INSERT INTO public.fixtures (api_football_id, team_season_id, ground_id, round, phase, match_date, kickoff_time, opponent_team_id, home_goals, away_goals, competition, status) SELECT ${fix.apiFootballId}, ts.id, ${groundIdExpr}, ${roundVal}, ${esc(fix.phase)}, '${fix.matchDate}', '${fix.kickoffTime}', (SELECT id FROM public.teams WHERE api_football_id = ${fix.opponentApiId}), ${fix.homeGoals ?? 'NULL'}, ${fix.awayGoals ?? 'NULL'}, ${esc(competition)}, ${esc(fix.status)} FROM public.team_seasons ts WHERE ts.team_id = ${ourTeamId} AND ts.season = ${fix.season} LIMIT 1 ON CONFLICT (api_football_id) DO NOTHING;`);
  }

  sql.push('');
  sql.push('-- ============================================================');
  sql.push(`-- SEED COMPLETE: ${allGrounds.size} grounds, ${allTeams.size} teams, ${uniqueTeamSeasons.length} team-seasons, ${seenFixtures.size} fixtures`);
  sql.push('-- ============================================================');

  // Write to file
  const { writeFileSync } = await import('fs');
  writeFileSync(OUTPUT_FILE, sql.join('\n') + '\n');

  console.log(`\n✓ Written to ${OUTPUT_FILE}`);
  console.log(`  ${allGrounds.size} grounds`);
  console.log(`  ${allTeams.size} teams`);
  console.log(`  ${uniqueTeamSeasons.length} team-seasons`);
  console.log(`  ${seenFixtures.size} fixtures`);
  console.log(`  ${requestCount} API requests made`);

  // Also write raw JSON for debugging
  const jsonData = {
    leagues: [...leagueMap.values()],
    grounds: [...allGrounds.entries()].map(([id, g]) => ({ apiId: id, ...g })),
    teams: [...allTeams.entries()].map(([id, t]) => ({ apiId: id, ...t })),
    teamSeasons: uniqueTeamSeasons,
    fixtureCount: seenFixtures.size,
  };
  writeFileSync('scripts/api-football-data.json', JSON.stringify(jsonData, null, 2));
  console.log(`  Also wrote scripts/api-football-data.json for reference`);
}

function esc(val: string | null): string {
  if (val === null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
