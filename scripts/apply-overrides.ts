/**
 * Applies name overrides from TSV files to:
 *   1. supabase/seed.sql — patches the INSERT statements in-place
 *   2. Live DB — generates UPDATE statements (apply-overrides.sql)
 *
 * Also handles schema migration of seed.sql:
 *   - Adds api_football_id to team INSERTs (extracted from logo URL)
 *   - Converts opponent_name → opponent_team_id in fixture INSERTs
 *
 * Usage:
 *   npx tsx scripts/apply-overrides.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';

// ---- Load overrides ----

interface TeamOverride { name: string; shortName: string }
interface GroundOverride { name: string }

const teamOverrides = new Map<number, TeamOverride>();
const groundOverrides = new Map<number, GroundOverride>();

for (const line of readFileSync('scripts/overrides/teams.tsv', 'utf-8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [id, name, shortName] = line.split('\t');
  if (id && name && shortName) {
    teamOverrides.set(Number(id), { name: name.trim(), shortName: shortName.trim() });
  }
}

for (const line of readFileSync('scripts/overrides/grounds.tsv', 'utf-8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [id, name] = line.split('\t');
  if (id && name) {
    groundOverrides.set(Number(id), { name: name.trim() });
  }
}

// Scan public/grounds/ for local image overrides
const localImages = new Map<number, string>(); // venue API ID → local path
try {
  for (const file of readdirSync('public/grounds')) {
    const match = file.match(/^(\d+)\.(jpg|jpeg|png|webp)$/i);
    if (match) {
      localImages.set(Number(match[1]), `/grounds/${file}`);
    }
  }
} catch { /* directory may not exist */ }

console.log(`Loaded ${teamOverrides.size} team overrides, ${groundOverrides.size} ground overrides, ${localImages.size} local ground images`);

// ---- Patch seed.sql ----

const seed = readFileSync('supabase/seed.sql', 'utf-8');
const lines = seed.split('\n');

// Load API data
const apiData = JSON.parse(readFileSync('scripts/api-football-data.json', 'utf-8'));

// Build team name → API ID maps (for opponent_name → opponent_team_id conversion)
const teamNameToApiId = new Map<string, number>();
for (const t of apiData.teams) {
  teamNameToApiId.set(t.name, t.apiId);
}
// Also map override names → API ID
for (const [apiId, override] of teamOverrides) {
  teamNameToApiId.set(override.name, apiId);
  teamNameToApiId.set(override.shortName, apiId);
}

function esc(val: string): string {
  return val.replace(/'/g, "''");
}

let patchedTeams = 0;
let patchedGrounds = 0;
let patchedImages = 0;
let migratedTeams = 0;
let migratedFixtures = 0;

// First pass: read current team names in seed (may be overridden names from previous runs)
for (const line of lines) {
  if (!line.startsWith("INSERT INTO public.teams")) continue;
  const logoMatch = line.match(/api-sports\.io\/football\/teams\/(\d+)\.png/);
  const nameMatch = line.match(/VALUES \(?(?:\d+, )?'([^']*(?:''[^']*)*)'/);
  if (logoMatch && nameMatch) {
    teamNameToApiId.set(nameMatch[1].replace(/''/g, "'"), Number(logoMatch[1]));
  }
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Patch team INSERTs
  if (line.startsWith("INSERT INTO public.teams")) {
    const logoMatch = line.match(/api-sports\.io\/football\/teams\/(\d+)\.png/);
    if (!logoMatch) continue;
    const apiId = Number(logoMatch[1]);

    // Migrate: add api_football_id column if not present
    if (!line.includes('api_football_id')) {
      lines[i] = lines[i]
        .replace('(name,', '(api_football_id, name,')
        .replace(/VALUES \('/, `VALUES (${apiId}, '`);
      migratedTeams++;
    }

    // Apply name overrides
    const override = teamOverrides.get(apiId);
    if (override) {
      // Match both old format: VALUES ('name', 'short', ... and new format: VALUES (id, 'name', 'short', ...
      const nameMatch = lines[i].match(/VALUES \((?:\d+, )?'([^']*(?:''[^']*)*)', '([^']*(?:''[^']*)*)',/);
      if (nameMatch) {
        lines[i] = lines[i]
          .replace(`'${nameMatch[1]}'`, `'${esc(override.name)}'`)
          .replace(`, '${nameMatch[2]}'`, `, '${esc(override.shortName)}'`);
        patchedTeams++;
      }
    }
  }

  // Patch ground INSERTs
  if (line.startsWith("INSERT INTO public.grounds")) {
    const venueMatch = line.match(/api_football_venue_id: (\d+)/);
    if (venueMatch) {
      const venueId = Number(venueMatch[1]);

      const override = groundOverrides.get(venueId);
      if (override) {
        const nameMatch = line.match(/VALUES \('([^']*(?:''[^']*)*)',/);
        if (nameMatch) {
          lines[i] = lines[i].replace(`VALUES ('${nameMatch[1]}',`, `VALUES ('${esc(override.name)}',`);
          patchedGrounds++;
        }
      }

      const localImg = localImages.get(venueId);
      const imageUrl = localImg ?? `https://media.api-sports.io/football/venues/${venueId}.png`;
      if (!lines[i].includes('image_url')) {
        lines[i] = lines[i]
          .replace('surface, notes)', 'surface, image_url, notes)')
          .replace(/, 'api_football_venue_id:/, `, '${imageUrl}', 'api_football_venue_id:`);
        patchedImages++;
      } else if (localImg) {
        lines[i] = lines[i].replace(
          /https:\/\/media\.api-sports\.io\/football\/venues\/\d+\.png/,
          localImg,
        );
        patchedImages++;
      }
    }
  }

  // Migrate fixture INSERTs: opponent_name → opponent_team_id
  if (line.startsWith("INSERT INTO public.fixtures") && line.includes('opponent_name')) {
    // Extract the opponent name string from the SELECT clause
    // Format: ..., opponent_name, ...) SELECT ..., 'OpponentName', ...
    const opNameMatch = line.match(/, '([^']*(?:''[^']*)*)', (NULL|\d+), (NULL|\d+), '([^']+)' FROM/);
    if (opNameMatch) {
      const opponentName = opNameMatch[1].replace(/''/g, "'");
      const opponentApiId = teamNameToApiId.get(opponentName);
      const opponentExpr = opponentApiId
        ? `(SELECT id FROM public.teams WHERE api_football_id = ${opponentApiId})`
        : 'NULL';

      // Replace column name
      lines[i] = lines[i].replace('opponent_name,', 'opponent_team_id,');
      // Replace the quoted name with the subquery
      lines[i] = lines[i].replace(
        `, '${esc(opponentName)}', ${opNameMatch[2]}, ${opNameMatch[3]}, '${opNameMatch[4]}' FROM`,
        `, ${opponentExpr}, ${opNameMatch[2]}, ${opNameMatch[3]}, '${opNameMatch[4]}' FROM`,
      );
      migratedFixtures++;
    }
  }
}

writeFileSync('supabase/seed.sql', lines.join('\n'));
console.log(`\nPatched supabase/seed.sql:`);
console.log(`  ${patchedTeams} team names overridden`);
console.log(`  ${patchedGrounds} ground names overridden`);
console.log(`  ${patchedImages} ground image URLs`);
if (migratedTeams > 0) console.log(`  ${migratedTeams} teams migrated (added api_football_id)`);
if (migratedFixtures > 0) console.log(`  ${migratedFixtures} fixtures migrated (opponent_name → opponent_team_id)`);

// ---- Generate SQL for live DB ----

const updateSql: string[] = [];
updateSql.push('-- Name overrides for live DB');

// Team updates: match by api_football_id
for (const [apiId, override] of teamOverrides) {
  updateSql.push(`UPDATE public.teams SET name = '${esc(override.name)}', short_name = '${esc(override.shortName)}' WHERE api_football_id = ${apiId};`);
}

// Ground name updates: match by notes field
for (const [venueId, override] of groundOverrides) {
  updateSql.push(`UPDATE public.grounds SET name = '${esc(override.name)}' WHERE notes LIKE '%api_football_venue_id: ${venueId}%';`);
}

// Ground image_url updates
for (const ground of apiData.grounds) {
  const localImg = localImages.get(ground.apiId);
  if (localImg) {
    updateSql.push(`UPDATE public.grounds SET image_url = '${localImg}' WHERE notes LIKE '%api_football_venue_id: ${ground.apiId}%';`);
  } else {
    const imageUrl = `https://media.api-sports.io/football/venues/${ground.apiId}.png`;
    updateSql.push(`UPDATE public.grounds SET image_url = '${imageUrl}' WHERE notes LIKE '%api_football_venue_id: ${ground.apiId}%' AND image_url IS NULL;`);
  }
}

const liveSqlFile = 'scripts/apply-overrides.sql';
writeFileSync(liveSqlFile, updateSql.join('\n') + '\n');
console.log(`\nGenerated ${liveSqlFile} with ${updateSql.length - 1} UPDATE statements`);
console.log('Run: PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/apply-overrides.sql');
