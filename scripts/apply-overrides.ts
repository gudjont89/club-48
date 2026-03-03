/**
 * Applies name overrides from TSV files to:
 *   1. supabase/seed.sql — patches the INSERT statements in-place
 *   2. Live DB — generates and executes UPDATE statements
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

let seed = readFileSync('supabase/seed.sql', 'utf-8');
const lines = seed.split('\n');

// Build a map: for each team INSERT line, find the API name used and replace it
// Teams: INSERT INTO public.teams (name, short_name, logo_url, city) VALUES ('FH hafnarfjordur', 'HAF', ...);
// We need to figure out which API ID corresponds to which team line.
// The seed doesn't include API IDs for teams, so we match by team order (sequential IDs).

// First, let's read api-football-data.json which has the API ID → name mapping
const apiData = JSON.parse(readFileSync('scripts/api-football-data.json', 'utf-8'));

// Build API team ID → API name map
const apiTeamNames = new Map<number, string>();
for (const t of apiData.teams) {
  apiTeamNames.set(t.apiId, t.name);
}

// Build API team name → overridden name map (for opponent name replacement in fixtures)
const nameReplacements = new Map<string, string>();

// Teams are inserted in alphabetical order by API name, with sequential IDs
const sortedApiTeams = [...apiData.teams].sort((a: any, b: any) => a.name.localeCompare(b.name));

let patchedTeams = 0;
let patchedGrounds = 0;
let patchedImages = 0;
let patchedOpponents = 0;

for (const apiTeam of sortedApiTeams) {
  const override = teamOverrides.get(apiTeam.apiId);
  if (override) {
    nameReplacements.set(apiTeam.name, override.name);
  }
}

// Patch team lines
function esc(val: string): string {
  return val.replace(/'/g, "''");
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Patch team INSERTs
  if (line.startsWith("INSERT INTO public.teams")) {
    // Extract current name from VALUES ('name', 'short_name', ...)
    const match = line.match(/VALUES \('([^']*(?:''[^']*)*)', '([^']*(?:''[^']*)*)',/);
    if (match) {
      const currentName = match[1].replace(/''/g, "'");
      // Find this team in API data
      const apiTeam = sortedApiTeams.find((t: any) => t.name === currentName);
      if (apiTeam) {
        const override = teamOverrides.get(apiTeam.apiId);
        if (override) {
          lines[i] = line
            .replace(`'${match[1]}'`, `'${esc(override.name)}'`)
            .replace(`, '${match[2]}'`, `, '${esc(override.shortName)}'`);
          patchedTeams++;
        }
      }
    }
  }

  // Patch ground INSERTs
  if (line.startsWith("INSERT INTO public.grounds")) {
    // Extract venue ID from notes: 'api_football_venue_id: 821'
    const venueMatch = line.match(/api_football_venue_id: (\d+)/);
    if (venueMatch) {
      const venueId = Number(venueMatch[1]);

      // Apply name override if present
      const override = groundOverrides.get(venueId);
      if (override) {
        const nameMatch = line.match(/VALUES \('([^']*(?:''[^']*)*)',/);
        if (nameMatch) {
          lines[i] = lines[i].replace(`VALUES ('${nameMatch[1]}',`, `VALUES ('${esc(override.name)}',`);
          patchedGrounds++;
        }
      }

      // Ensure image_url is in the INSERT (add column + value if missing)
      const localImg = localImages.get(venueId);
      const imageUrl = localImg ?? `https://media.api-sports.io/football/venues/${venueId}.png`;
      if (!lines[i].includes('image_url')) {
        lines[i] = lines[i]
          .replace('surface, notes)', 'surface, image_url, notes)')
          .replace(/, 'api_football_venue_id:/, `, '${imageUrl}', 'api_football_venue_id:`);
        patchedImages++;
      } else if (localImg) {
        // Replace existing image_url with local override
        lines[i] = lines[i].replace(
          /https:\/\/media\.api-sports\.io\/football\/venues\/\d+\.png/,
          localImg,
        );
        patchedImages++;
      }
    }
  }

  // Patch opponent names in fixture INSERTs
  if (line.startsWith("INSERT INTO public.fixtures")) {
    for (const [apiName, overrideName] of nameReplacements) {
      if (line.includes(`'${esc(apiName)}'`)) {
        lines[i] = lines[i].replace(`'${esc(apiName)}'`, `'${esc(overrideName)}'`);
        patchedOpponents++;
        break;
      }
    }
  }
}

writeFileSync('supabase/seed.sql', lines.join('\n'));
console.log(`\nPatched supabase/seed.sql:`);
console.log(`  ${patchedTeams} team names`);
console.log(`  ${patchedGrounds} ground names`);
console.log(`  ${patchedImages} ground image URLs added`);
console.log(`  ${patchedOpponents} opponent names in fixtures`);

// ---- Generate SQL for live DB ----

const updateSql: string[] = [];
updateSql.push('-- Name overrides for live DB');

// Team updates: we need the DB team ID. Teams were inserted sequentially.
// DB ID 1 = first alphabetically sorted team, etc.
for (let idx = 0; idx < sortedApiTeams.length; idx++) {
  const apiTeam = sortedApiTeams[idx];
  const override = teamOverrides.get(apiTeam.apiId);
  if (override) {
    const dbId = idx + 1;
    updateSql.push(`UPDATE public.teams SET name = '${esc(override.name)}', short_name = '${esc(override.shortName)}' WHERE id = ${dbId};`);
  }
}

// Ground name updates: match by notes field
for (const [venueId, override] of groundOverrides) {
  updateSql.push(`UPDATE public.grounds SET name = '${esc(override.name)}' WHERE notes LIKE '%api_football_venue_id: ${venueId}%';`);
}

// Ground image_url updates: set for all grounds based on venue ID in notes
// Local images take priority over API images
for (const ground of apiData.grounds) {
  const localImg = localImages.get(ground.apiId);
  if (localImg) {
    updateSql.push(`UPDATE public.grounds SET image_url = '${localImg}' WHERE notes LIKE '%api_football_venue_id: ${ground.apiId}%';`);
  } else {
    const imageUrl = `https://media.api-sports.io/football/venues/${ground.apiId}.png`;
    updateSql.push(`UPDATE public.grounds SET image_url = '${imageUrl}' WHERE notes LIKE '%api_football_venue_id: ${ground.apiId}%' AND image_url IS NULL;`);
  }
}

// Opponent name updates in fixtures
for (const [apiName, overrideName] of nameReplacements) {
  updateSql.push(`UPDATE public.fixtures SET opponent_name = '${esc(overrideName)}' WHERE opponent_name = '${esc(apiName)}';`);
}

const liveSqlFile = 'scripts/apply-overrides.sql';
writeFileSync(liveSqlFile, updateSql.join('\n') + '\n');
console.log(`\nGenerated ${liveSqlFile} with ${updateSql.length - 1} UPDATE statements`);
console.log('Run: PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/apply-overrides.sql');
