/**
 * 48 Klúbburinn — KSI.is Fixture Scraper
 *
 * Scrapes 3. deild fixtures from ksi.is and outputs JSON
 * that the seed script can consume.
 *
 * Usage:
 *   npx tsx scripts/scrape-ksi.ts
 *
 * Output: scripts/ksi-data.json
 */

const fs = await import('fs');
const path = await import('path');

// ---- Config ----

interface KsiCompetition {
  motId: number;
  season: number;
  division: number;
}

// Add new seasons/competitions here
const COMPETITIONS: KsiCompetition[] = [
  { motId: 190363, season: 2025, division: 4 },
];

const OUTPUT_FILE = path.resolve(import.meta.dirname!, 'ksi-data.json');

// KSI team name → API-Football team ID
const TEAM_MAP: Record<string, number> = {
  'Hvíti riddarinn': 6085,
  'Magni': 2124,
  'Augnablik': 6077,
  'Tindastóll': 4168,
  'Reynir S.': 6101,
  'Árbær': 18479,
  'KV': 4163,
  'Ýmir': 6115,
  'Sindri': 4164,
  'KF': 4162,
  'KFK Fullorðnir Karlar': 18477,
  'ÍH': 6112,
};

// KSI venue name → API-Football venue ID
// Includes sponsor names → canonical ground mapping
const VENUE_MAP: Record<string, number> = {
  'Malbikstöðin að Varmá': 20543,     // = Varmárvöllur
  'Boginn': 21597,
  'Fífan': 20545,
  'Sauðárkróksvöllur': 3183,
  'Brons völlurinn': 20548,            // = Brons-völlurinn
  'Domusnovavöllurinn': 2320,          // = Leiknisvöllur
  'KR-völlur': 10591,
  'Kórinn': 824,
  'Jökulfellsvöllurinn': 20544,
  'Dalvíkurvöllur': 3187,
  'Fagrilundur - gervigras': 4532,     // = Fagrilundur
  'Skessan': 11562,
  'Ólafsfjarðarvöllur': 3178,
  'Grenivíkurvöllur': 2316,
  'Kópavogsvöllur': 820,
  'Smárinn': 20545,                   // Side pitch at Dalsmári 5, same complex as Fífan
};

// KSI team name → home ground API-Football venue ID (primary home ground)
const HOME_GROUND_MAP: Record<string, number> = {
  'Hvíti riddarinn': 20543,
  'Magni': 21597,
  'Augnablik': 20545,
  'Tindastóll': 3183,
  'Reynir S.': 20548,
  'Árbær': 2320,
  'KV': 10591,
  'Ýmir': 824,
  'Sindri': 20544,
  'KF': 3187,
  'KFK Fullorðnir Karlar': 4532,
  'ÍH': 11562,
};

// Icelandic month names → month number (0-indexed)
const MONTHS: Record<string, number> = {
  'janúar': 0, 'jan': 0, 'jan.': 0,
  'febrúar': 1, 'feb': 1, 'feb.': 1,
  'mars': 2, 'mar': 2, 'mar.': 2,
  'apríl': 3, 'apr': 3, 'apr.': 3,
  'maí': 4,
  'júní': 5, 'jún': 5, 'jún.': 5,
  'júlí': 6, 'júl': 6, 'júl.': 6,
  'ágúst': 7, 'ágú': 7, 'ágú.': 7,
  'september': 8, 'sep': 8, 'sep.': 8,
  'október': 9, 'okt': 9, 'okt.': 9,
  'nóvember': 10, 'nóv': 10, 'nóv.': 10,
  'desember': 11, 'des': 11, 'des.': 11,
};

// ---- Types ----

interface KsiFixture {
  season: number;
  division: number;
  matchDate: string;       // YYYY-MM-DD
  kickoffTime: string;     // HH:MM
  homeTeamApiId: number;
  awayTeamApiId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  venueApiId: number | null;
  status: 'FT' | 'NS';
}

interface KsiTeamSeason {
  apiTeamId: number;
  season: number;
  division: number;
  homeGroundApiId: number;
}

interface KsiData {
  scrapedAt: string;
  competitions: KsiCompetition[];
  teamSeasons: KsiTeamSeason[];
  fixtures: KsiFixture[];
  unmappedTeams: string[];
  unmappedVenues: string[];
}

// ---- Scraper ----

async function fetchPage(motId: number, page: number): Promise<string> {
  const url = `https://www.ksi.is/oll-mot/mot?id=${motId}&banner-tab=matches-and-results&page=${page}`;
  console.log(`  Fetching page ${page}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseDate(dateStr: string, season: number): string {
  // Format: "Fös 2. maí  20:00" or "Lau 3. maí  14:00"
  const match = dateStr.match(/(\d+)\.\s+(\S+)/);
  if (!match) return '';
  const day = parseInt(match[1]);
  const monthStr = match[2].toLowerCase();
  const month = MONTHS[monthStr];
  if (month === undefined) return '';
  const year = season;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseTime(dateStr: string): string {
  const match = dateStr.match(/(\d{1,2}:\d{2})\s*$/);
  return match ? match[1] : '';
}

function parseFixtures(html: string, comp: KsiCompetition): { fixtures: KsiFixture[]; unmappedTeams: Set<string>; unmappedVenues: Set<string> } {
  const fixtures: KsiFixture[] = [];
  const unmappedTeams = new Set<string>();
  const unmappedVenues = new Set<string>();

  // Split into match blocks — each match has a date/time span followed by team links and score
  // Date pattern: <span class="body-5">Fös 2. maí  20:00</span>
  // We'll find all date spans and then extract teams/score/venue after each

  // Strategy: find all occurrences of date/venue/teams/score in order
  // The HTML repeats this pattern for each match:
  // 1. date+time span (body-5, contains day abbreviation + date + time)
  // 2. venue span (body-5 overflow-hidden)
  // 3. home team span (body-4 text-right)
  // 4. score span (body-4 whitespace-nowrap)
  // 5. away team span (body-4 group-hover:underline, without text-right)

  // Extract dates
  const dateRegex = /<span class="body-5">([^<]+?(?:\d{1,2}:\d{2}))<\/span>/g;
  const dates: string[] = [];
  let m;
  while ((m = dateRegex.exec(html)) !== null) {
    dates.push(m[1].trim());
  }

  // Extract venues
  const venueRegex = /<span class="body-5 overflow-hidden whitespace-nowrap text-ellipsis">([^<]+)<\/span>/g;
  const venues: string[] = [];
  while ((m = venueRegex.exec(html)) !== null) {
    venues.push(m[1].trim());
  }

  // Extract home teams (text-right)
  const homeRegex = /<span class="body-4 group-hover:underline text-right">([^<]+)<\/span>/g;
  const homeTeams: string[] = [];
  while ((m = homeRegex.exec(html)) !== null) {
    homeTeams.push(m[1].trim());
  }

  // Extract scores
  const scoreRegex = /<span class="body-4 whitespace-nowrap">([^<]+)<\/span>/g;
  const scores: string[] = [];
  while ((m = scoreRegex.exec(html)) !== null) {
    scores.push(m[1].trim());
  }

  // Extract away teams (no text-right)
  const awayRegex = /<span class="body-4 group-hover:underline">([^<]+)<\/span>/g;
  const awayTeams: string[] = [];
  while ((m = awayRegex.exec(html)) !== null) {
    awayTeams.push(m[1].trim());
  }

  const count = Math.min(dates.length, venues.length, homeTeams.length, scores.length, awayTeams.length);

  for (let i = 0; i < count; i++) {
    const matchDate = parseDate(dates[i], comp.season);
    const kickoffTime = parseTime(dates[i]);
    const homeTeamApiId = TEAM_MAP[homeTeams[i]];
    const awayTeamApiId = TEAM_MAP[awayTeams[i]];
    const venueApiId = VENUE_MAP[venues[i]] ?? null;

    if (!homeTeamApiId) unmappedTeams.add(homeTeams[i]);
    if (!awayTeamApiId) unmappedTeams.add(awayTeams[i]);
    if (!venueApiId) unmappedVenues.add(venues[i]);

    if (!homeTeamApiId || !awayTeamApiId || !matchDate) continue;

    // Parse score
    const scoreParts = scores[i].match(/(\d+)\s*-\s*(\d+)/);
    const homeGoals = scoreParts ? parseInt(scoreParts[1]) : null;
    const awayGoals = scoreParts ? parseInt(scoreParts[2]) : null;
    const status = homeGoals !== null ? 'FT' as const : 'NS' as const;

    fixtures.push({
      season: comp.season,
      division: comp.division,
      matchDate,
      kickoffTime,
      homeTeamApiId,
      awayTeamApiId,
      homeGoals,
      awayGoals,
      venueApiId,
      status,
    });
  }

  return { fixtures, unmappedTeams, unmappedVenues };
}

// ---- Main ----

async function main() {
  console.log('=== KSI.is Fixture Scraper ===\n');

  const allFixtures: KsiFixture[] = [];
  const allTeamSeasons: KsiTeamSeason[] = [];
  const allUnmappedTeams = new Set<string>();
  const allUnmappedVenues = new Set<string>();

  for (const comp of COMPETITIONS) {
    console.log(`Scraping motId=${comp.motId} (${comp.season}, division ${comp.division})...`);

    // Build team_seasons from HOME_GROUND_MAP
    for (const [teamName, groundApiId] of Object.entries(HOME_GROUND_MAP)) {
      const apiTeamId = TEAM_MAP[teamName];
      if (!apiTeamId) continue;
      allTeamSeasons.push({
        apiTeamId,
        season: comp.season,
        division: comp.division,
        homeGroundApiId: groundApiId,
      });
    }

    // Fetch all pages
    let page = 1;
    let totalFixtures = 0;
    while (true) {
      const html = await fetchPage(comp.motId, page);
      const { fixtures, unmappedTeams, unmappedVenues } = parseFixtures(html, comp);

      if (fixtures.length === 0) break;

      allFixtures.push(...fixtures);
      for (const t of unmappedTeams) allUnmappedTeams.add(t);
      for (const v of unmappedVenues) allUnmappedVenues.add(v);
      totalFixtures += fixtures.length;

      console.log(`  Page ${page}: ${fixtures.length} fixtures`);
      page++;

      // Rate limit courtesy
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`  Total: ${totalFixtures} fixtures\n`);
  }

  // Report unmapped
  if (allUnmappedTeams.size > 0) {
    console.log('WARNING: Unmapped teams:');
    for (const t of allUnmappedTeams) console.log(`  - "${t}"`);
    console.log();
  }
  if (allUnmappedVenues.size > 0) {
    console.log('WARNING: Unmapped venues:');
    for (const v of allUnmappedVenues) console.log(`  - "${v}"`);
    console.log();
  }

  const data: KsiData = {
    scrapedAt: new Date().toISOString(),
    competitions: COMPETITIONS,
    teamSeasons: allTeamSeasons,
    fixtures: allFixtures,
    unmappedTeams: [...allUnmappedTeams],
    unmappedVenues: [...allUnmappedVenues],
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote ${allFixtures.length} fixtures and ${allTeamSeasons.length} team_seasons to ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
