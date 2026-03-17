/**
 * Scrape KSÍ website for Besta deild karla (top division) fixtures
 * Produces CSV files: teams.csv, grounds.csv, fixtures.csv, team_seasons.csv
 *
 * Usage: npx tsx scripts/scrape-ksi-besta-deild.ts
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';

// Competition IDs from ksi.is
const COMPETITIONS: { season: number; id: number; name: string }[] = [
  { season: 2023, id: 190224, name: 'Besta deild karla' },
  { season: 2024, id: 190265, name: 'Besta deild karla' },
  { season: 2025, id: 190366, name: 'Besta deild karla' },
];

// Icelandic month names → 1-indexed month number
const MONTHS: Record<string, number> = {
  'janúar': 1, 'jan': 1, 'jan.': 1,
  'febrúar': 2, 'feb': 2, 'feb.': 2,
  'mars': 3, 'mar': 3, 'mar.': 3,
  'apríl': 4, 'apr': 4, 'apr.': 4,
  'maí': 5,
  'júní': 6, 'jún': 6, 'jún.': 6,
  'júlí': 7, 'júl': 7, 'júl.': 7,
  'ágúst': 8, 'ágú': 8, 'ágú.': 8,
  'september': 9, 'sep': 9, 'sep.': 9,
  'október': 10, 'okt': 10, 'okt.': 10,
  'nóvember': 11, 'nóv': 11, 'nóv.': 11,
  'desember': 12, 'des': 12, 'des.': 12,
};

interface RawMatch {
  season: number;
  matchDate: string;       // YYYY-MM-DD
  kickoffTime: string;     // HH:MM
  homeTeam: string;
  homeTeamKsiId: string;
  awayTeam: string;
  awayTeamKsiId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  venue: string;
  status: 'FT' | 'NS';
  ksiMatchId: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(motId: number, page: number): Promise<string> {
  const url = `https://www.ksi.is/oll-mot/mot?id=${motId}&banner-tab=matches-and-results&page=${page}`;
  console.log(`  Fetching page ${page}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseDate(dateStr: string, season: number): string {
  const match = dateStr.match(/(\d+)\.\s+(\S+)/);
  if (!match) return '';
  const day = parseInt(match[1]);
  const monthStr = match[2].toLowerCase();
  const month = MONTHS[monthStr];
  if (month === undefined) return '';
  return `${season}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseTime(dateStr: string): string {
  const match = dateStr.match(/(\d{1,2}:\d{2})\s*$/);
  return match ? match[1].padStart(5, '0') : '';
}

function parseFixtures(html: string, season: number): RawMatch[] {
  const matches: RawMatch[] = [];

  // Extract dates: <span class="body-5">Fös 2. maí  20:00</span>
  const dateRegex = /<span class="body-5">([^<]+?(?:\d{1,2}:\d{2}))<\/span>/g;
  const dates: string[] = [];
  let m;
  while ((m = dateRegex.exec(html)) !== null) {
    dates.push(m[1].trim());
  }

  // Extract venues: <span class="body-5 overflow-hidden whitespace-nowrap text-ellipsis">...</span>
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

  // Extract team KSÍ IDs from links: /oll-mot/mot/lid?id=TEAM_ID&#38;competitionId=...
  // Each match has exactly 3 team links: mobile home, desktop home, desktop away.
  // We take the 1st as home and the 3rd as away from each group of 3.
  const teamIdRegex = /\/oll-mot\/mot\/lid\?id=(\d+)(?:&amp;|&#38;)competitionId=\d+/g;
  const rawTeamIds: string[] = [];
  while ((m = teamIdRegex.exec(html)) !== null) {
    rawTeamIds.push(m[1]);
  }
  // Group into triples: [mobile_home, desktop_home, away]
  const teamIds: string[] = [];
  for (let i = 0; i + 2 < rawTeamIds.length; i += 3) {
    teamIds.push(rawTeamIds[i]);     // home
    teamIds.push(rawTeamIds[i + 2]); // away
  }

  // Extract match IDs: /leikir-og-urslit/felagslid/leikur?id=XXXXXX
  // Each appears twice per match, take every other one
  const matchIdRegex = /leikir-og-urslit\/felagslid\/leikur\?id=(\d+)/g;
  const rawMatchIds: string[] = [];
  while ((m = matchIdRegex.exec(html)) !== null) {
    rawMatchIds.push(m[1]);
  }
  const matchIds: string[] = [];
  for (let i = 0; i < rawMatchIds.length; i += 2) {
    matchIds.push(rawMatchIds[i]);
  }

  const count = Math.min(dates.length, venues.length, homeTeams.length, scores.length, awayTeams.length);

  for (let i = 0; i < count; i++) {
    const matchDate = parseDate(dates[i], season);
    const kickoffTime = parseTime(dates[i]);

    const scoreParts = scores[i].match(/(\d+)\s*-\s*(\d+)/);
    const homeGoals = scoreParts ? parseInt(scoreParts[1]) : null;
    const awayGoals = scoreParts ? parseInt(scoreParts[2]) : null;

    matches.push({
      season,
      matchDate,
      kickoffTime,
      homeTeam: homeTeams[i],
      homeTeamKsiId: teamIds[i * 2] || '',
      awayTeam: awayTeams[i],
      awayTeamKsiId: teamIds[i * 2 + 1] || '',
      homeGoals,
      awayGoals,
      venue: venues[i],
      status: homeGoals !== null ? 'FT' : 'NS',
      ksiMatchId: matchIds[i] || '',
    });
  }

  return matches;
}

async function scrapeCompetition(season: number, motId: number): Promise<RawMatch[]> {
  const allMatches: RawMatch[] = [];

  const firstHtml = await fetchPage(motId, 1);

  // Find total pages from "1 af N"
  const pageCountMatch = firstHtml.match(/(\d+)\s+af\s+(\d+)/);
  const totalPages = pageCountMatch ? parseInt(pageCountMatch[2]) : 1;
  console.log(`  Total pages: ${totalPages}`);

  const firstMatches = parseFixtures(firstHtml, season);
  allMatches.push(...firstMatches);
  console.log(`  Page 1: ${firstMatches.length} matches`);

  for (let page = 2; page <= totalPages; page++) {
    await delay(500);
    const html = await fetchPage(motId, page);
    const matches = parseFixtures(html, season);
    allMatches.push(...matches);
    console.log(`  Page ${page}: ${matches.length} matches`);
  }

  return allMatches;
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log('=== KSÍ Besta deild karla scraper ===\n');

  const allMatches: RawMatch[] = [];

  for (const comp of COMPETITIONS) {
    console.log(`\n${comp.name} ${comp.season} (id=${comp.id})...`);
    const matches = await scrapeCompetition(comp.season, comp.id);
    allMatches.push(...matches);
    console.log(`  Total: ${matches.length} matches`);
    await delay(1000);
  }

  // ---- Load ground aliases (venue name → canonical ground ID) ----
  // This file is maintained manually and persists across scraper runs.
  // Format: alias_name,ground_id
  // Format: ground_id,alias_name,first_year,is_sponsor
  const ALIASES_FILE = 'data/ksi/ground_aliases.csv';
  const aliasToGroundId = new Map<string, number>(); // venue name alias → ground ID
  if (existsSync(ALIASES_FILE)) {
    for (const line of readFileSync(ALIASES_FILE, 'utf-8').split('\n').slice(1)) {
      if (!line.trim()) continue;
      const match = line.match(/^(\d+),(.+?),/);
      if (match) aliasToGroundId.set(match[2], parseInt(match[1]));
    }
    console.log(`\nLoaded ${aliasToGroundId.size} ground aliases`);
  }

  // ---- Build unique teams ----
  const teamMap = new Map<string, string>(); // ksiId -> name
  for (const m of allMatches) {
    if (m.homeTeamKsiId) teamMap.set(m.homeTeamKsiId, m.homeTeam);
    if (m.awayTeamKsiId) teamMap.set(m.awayTeamKsiId, m.awayTeam);
  }

  // ---- Build grounds with IDs ----
  // Load existing grounds.csv to preserve IDs across runs
  const GROUNDS_FILE = 'data/ksi/grounds.csv';
  const groundNameToId = new Map<string, number>(); // canonical name → ID
  const groundIdToName = new Map<number, string>();  // ID → canonical name
  let nextGroundId = 1;

  if (existsSync(GROUNDS_FILE)) {
    for (const line of readFileSync(GROUNDS_FILE, 'utf-8').split('\n').slice(1)) {
      if (!line.trim()) continue;
      const match = line.match(/^(\d+),(.+)$/);
      if (match) {
        const id = parseInt(match[1]);
        const name = match[2].replace(/^"|"$/g, '').replace(/""/g, '"');
        groundNameToId.set(name, id);
        groundIdToName.set(id, name);
        nextGroundId = Math.max(nextGroundId, id + 1);
      }
    }
    console.log(`Loaded ${groundNameToId.size} existing grounds`);
  }

  // Resolve a venue name to a ground ID, creating new grounds as needed
  function resolveGroundId(venueName: string): number | null {
    if (!venueName) return null;
    // Check if it's an alias
    const aliasId = aliasToGroundId.get(venueName);
    if (aliasId !== undefined) return aliasId;
    // Check if it's already a canonical ground
    const existingId = groundNameToId.get(venueName);
    if (existingId !== undefined) return existingId;
    // Create new ground
    const id = nextGroundId++;
    groundNameToId.set(venueName, id);
    groundIdToName.set(id, venueName);
    return id;
  }

  // Resolve all venues from fixtures
  for (const m of allMatches) {
    if (m.venue) resolveGroundId(m.venue);
  }

  // ---- Build team-seasons with home ground ----
  const homeVenueCounts = new Map<string, Map<string, number>>();
  for (const m of allMatches) {
    if (!m.venue || !m.homeTeamKsiId) continue;
    const key = `${m.homeTeamKsiId}-${m.season}`;
    if (!homeVenueCounts.has(key)) homeVenueCounts.set(key, new Map());
    const counts = homeVenueCounts.get(key)!;
    counts.set(m.venue, (counts.get(m.venue) || 0) + 1);
  }

  interface TeamSeason {
    ksiTeamId: string;
    teamName: string;
    season: number;
    homeGroundId: number | null;
  }

  const teamSeasons: TeamSeason[] = [];
  const teamsBySeason = new Map<string, Set<number>>();
  for (const m of allMatches) {
    for (const [id, season] of [[m.homeTeamKsiId, m.season], [m.awayTeamKsiId, m.season]] as [string, number][]) {
      if (!id) continue;
      if (!teamsBySeason.has(id)) teamsBySeason.set(id, new Set());
      teamsBySeason.get(id)!.add(season);
    }
  }

  for (const [ksiId, seasons] of teamsBySeason) {
    for (const season of [...seasons].sort()) {
      const key = `${ksiId}-${season}`;
      const counts = homeVenueCounts.get(key);
      let homeVenue = '';
      if (counts) {
        let maxCount = 0;
        for (const [venue, count] of counts) {
          if (count > maxCount) {
            maxCount = count;
            homeVenue = venue;
          }
        }
      }
      teamSeasons.push({
        ksiTeamId: ksiId,
        teamName: teamMap.get(ksiId) || '',
        season,
        homeGroundId: resolveGroundId(homeVenue),
      });
    }
  }

  // ---- Write CSVs ----

  // teams.csv
  let teamsCsv = 'ksi_id,name\n';
  for (const [id, name] of [...teamMap.entries()].sort((a, b) => a[1].localeCompare(b[1], 'is'))) {
    teamsCsv += `${id},${csvEscape(name)}\n`;
  }
  writeFileSync('data/ksi/teams.csv', teamsCsv);
  console.log(`\nWrote data/ksi/teams.csv (${teamMap.size} teams)`);

  // grounds.csv — id,name
  let groundsCsv = 'id,name\n';
  for (const [id, name] of [...groundIdToName.entries()].sort((a, b) => a[0] - b[0])) {
    groundsCsv += `${id},${csvEscape(name)}\n`;
  }
  writeFileSync(GROUNDS_FILE, groundsCsv);
  console.log(`Wrote ${GROUNDS_FILE} (${groundIdToName.size} grounds)`);

  // ground_aliases.csv — alias_name,ground_id
  // Only write if it doesn't exist yet (it's manually maintained)
  if (!existsSync(ALIASES_FILE)) {
    writeFileSync(ALIASES_FILE, 'ground_id,alias_name,first_year,is_sponsor\n');
    console.log(`Created ${ALIASES_FILE} (empty — add aliases manually)`);
  }

  // team_seasons.csv
  let teamSeasonsCsv = 'ksi_team_id,team_name,season,home_ground_id\n';
  for (const ts of teamSeasons.sort((a, b) => a.season - b.season || a.teamName.localeCompare(b.teamName, 'is'))) {
    teamSeasonsCsv += `${ts.ksiTeamId},${csvEscape(ts.teamName)},${ts.season},${ts.homeGroundId ?? ''}\n`;
  }
  writeFileSync('data/ksi/team_seasons.csv', teamSeasonsCsv);
  console.log(`Wrote data/ksi/team_seasons.csv (${teamSeasons.length} entries)`);

  // fixtures.csv
  let fixturesCsv = 'ksi_match_id,season,date,time,home_team_ksi_id,away_team_ksi_id,home_goals,away_goals,ground_id,status\n';
  for (const m of allMatches) {
    fixturesCsv += [
      m.ksiMatchId,
      m.season,
      m.matchDate,
      m.kickoffTime,
      m.homeTeamKsiId,
      m.awayTeamKsiId,
      m.homeGoals ?? '',
      m.awayGoals ?? '',
      resolveGroundId(m.venue) ?? '',
      m.status,
    ].join(',') + '\n';
  }
  writeFileSync('data/ksi/fixtures.csv', fixturesCsv);
  console.log(`Wrote data/ksi/fixtures.csv (${allMatches.length} fixtures)`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
