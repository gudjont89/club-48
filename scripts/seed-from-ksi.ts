/**
 * Generate seed.sql from KSÍ CSV data files
 *
 * Reads: data/ksi/grounds.csv, teams.csv, team_seasons.csv, fixtures.csv
 * Writes: supabase/seed.sql
 *
 * Usage: npx tsx scripts/seed-from-ksi.ts
 */

import { readFileSync, writeFileSync } from 'fs';

function parseCsv(path: string): Record<string, string>[] {
  const lines = readFileSync(path, 'utf-8').split('\n');
  const headers = lines[0].split(',');
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

function sqlStr(s: string): string {
  if (!s) return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlNum(s: string): string {
  if (!s) return 'NULL';
  return s;
}

// ---- Load CSVs ----

const grounds = parseCsv('data/ksi/grounds.csv');
const teams = parseCsv('data/ksi/teams.csv');
const teamSeasons = parseCsv('data/ksi/team_seasons.csv');
const fixtures = parseCsv('data/ksi/fixtures.csv');

console.log(`Loaded: ${grounds.length} grounds, ${teams.length} teams, ${teamSeasons.length} team_seasons, ${fixtures.length} fixtures`);

// ---- Build SQL ----

const out: string[] = [];
out.push(`-- Seed data generated from KSÍ CSVs on ${new Date().toISOString()}`);
out.push('');

// Grounds — use overrideId so we can reference them by CSV id
out.push('-- Grounds');
for (const g of grounds) {
  out.push(`INSERT INTO public.grounds OVERRIDING SYSTEM VALUE VALUES (${g.id}, ${sqlStr(g.name)}, ${sqlStr(g.city)}, ${sqlNum(g.latitude)}, ${sqlNum(g.longitude)}, ${sqlNum(g.capacity)}, ${sqlStr(g.surface)}, now(), now());`);
}
out.push(`SELECT setval(pg_get_serial_sequence('public.grounds', 'id'), (SELECT MAX(id) FROM public.grounds));`);
out.push('');

// Teams — use ksi_id, generate auto id
out.push('-- Teams');
for (const t of teams) {
  out.push(`INSERT INTO public.teams (ksi_id, name, short_name) VALUES (${t.ksi_id}, ${sqlStr(t.name)}, ${sqlStr(t.short_name)});`);
}
out.push('');

// Team seasons — need to resolve team ksi_id → teams.id and ground csv id → grounds.id
out.push('-- Team seasons');
for (const ts of teamSeasons) {
  out.push(`INSERT INTO public.team_seasons (team_id, season, division, ground_id) VALUES ((SELECT id FROM public.teams WHERE ksi_id = ${ts.ksi_team_id}), ${ts.season}, ${ts.division}, ${ts.home_ground_id});`);
}
out.push('');

// Fixtures — need to resolve home team + season → team_season_id, away team ksi_id → teams.id
out.push('-- Fixtures');
for (const f of fixtures) {
  const teamSeasonSubquery = `(SELECT ts.id FROM public.team_seasons ts JOIN public.teams t ON t.id = ts.team_id WHERE t.ksi_id = ${f.home_team_ksi_id} AND ts.season = ${f.season})`;
  const opponentSubquery = f.away_team_ksi_id
    ? `(SELECT id FROM public.teams WHERE ksi_id = ${f.away_team_ksi_id})`
    : 'NULL';
  out.push(`INSERT INTO public.fixtures (ksi_match_id, team_season_id, match_date, kickoff_time, opponent_team_id, home_goals, away_goals, ground_id, competition_type, status) VALUES (${sqlNum(f.ksi_match_id)}, ${teamSeasonSubquery}, ${sqlStr(f.date)}, ${sqlStr(f.time)}, ${opponentSubquery}, ${sqlNum(f.home_goals)}, ${sqlNum(f.away_goals)}, ${sqlNum(f.ground_id)}, 'league', ${sqlStr(f.status)});`);
}
out.push('');

const sql = out.join('\n');
writeFileSync('supabase/seed.sql', sql);
console.log(`Wrote supabase/seed.sql (${out.length} lines)`);
