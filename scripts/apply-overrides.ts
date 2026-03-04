/**
 * Applies TSV overrides directly to the live Supabase database.
 * Patches ground names, ground images, and team names without a full re-seed.
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/apply-overrides.ts
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ---- Config ----

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---- Load TSV files ----

interface TeamOverride { name: string; shortName: string }

function loadGroundNameOverrides(): Map<number, string> {
  const map = new Map<number, string>();
  const file = 'scripts/overrides/grounds.tsv';
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [id, name] = line.split('\t');
    if (id && name) map.set(Number(id.trim()), name.trim());
  }
  return map;
}

function loadGroundImageOverrides(): Map<number, string> {
  const map = new Map<number, string>();
  const file = 'scripts/overrides/ground-images.tsv';
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [id, url] = line.split('\t');
    if (id && url) map.set(Number(id.trim()), url.trim());
  }
  return map;
}

function loadTeamOverrides(): Map<number, TeamOverride> {
  const map = new Map<number, TeamOverride>();
  const file = 'scripts/overrides/teams.tsv';
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [id, name, shortName] = line.split('\t');
    if (id && name && shortName) {
      map.set(Number(id.trim()), { name: name.trim(), shortName: shortName.trim() });
    }
  }
  return map;
}

// ---- Main ----

async function main() {
  const groundNames = loadGroundNameOverrides();
  const groundImages = loadGroundImageOverrides();
  const teamOverrides = loadTeamOverrides();

  console.log(`Loaded overrides: ${groundNames.size} ground names, ${groundImages.size} ground images, ${teamOverrides.size} teams`);

  // Fetch grounds and build venue API ID → DB ID map
  const { data: grounds, error: gErr } = await supabase
    .from('grounds')
    .select('id, name, image_url, notes');
  if (gErr) { console.error('Failed to fetch grounds:', gErr.message); process.exit(1); }

  const venueToGround = new Map<number, { dbId: number; name: string; imageUrl: string | null }>();
  for (const g of grounds ?? []) {
    const match = g.notes?.match(/api_football_venue_id: (\d+)/);
    if (match) {
      venueToGround.set(Number(match[1]), { dbId: g.id, name: g.name, imageUrl: g.image_url });
    }
  }

  // Apply ground name overrides
  let updatedNames = 0;
  for (const [venueId, newName] of groundNames) {
    const ground = venueToGround.get(venueId);
    if (!ground) { console.warn(`  Ground name: venue ${venueId} not found in DB, skipping`); continue; }
    if (ground.name === newName) continue;

    const { error } = await supabase
      .from('grounds')
      .update({ name: newName })
      .eq('id', ground.dbId);
    if (error) { console.error(`  Failed to update ground ${venueId}:`, error.message); continue; }
    console.log(`  Ground ${venueId}: "${ground.name}" → "${newName}"`);
    updatedNames++;
  }

  // Apply ground image overrides
  let updatedImages = 0;
  for (const [venueId, newUrl] of groundImages) {
    const ground = venueToGround.get(venueId);
    if (!ground) { console.warn(`  Ground image: venue ${venueId} not found in DB, skipping`); continue; }
    if (ground.imageUrl === newUrl) continue;

    const { error } = await supabase
      .from('grounds')
      .update({ image_url: newUrl })
      .eq('id', ground.dbId);
    if (error) { console.error(`  Failed to update image for ground ${venueId}:`, error.message); continue; }
    console.log(`  Ground ${venueId} image: "${ground.imageUrl}" → "${newUrl}"`);
    updatedImages++;
  }

  // Fetch teams and build API ID → DB ID map
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('id, name, short_name, api_football_id');
  if (tErr) { console.error('Failed to fetch teams:', tErr.message); process.exit(1); }

  const apiIdToTeam = new Map<number, { dbId: number; name: string; shortName: string }>();
  for (const t of teams ?? []) {
    if (t.api_football_id != null) {
      apiIdToTeam.set(t.api_football_id, { dbId: t.id, name: t.name, shortName: t.short_name });
    }
  }

  // Apply team overrides
  let updatedTeams = 0;
  for (const [apiId, override] of teamOverrides) {
    const team = apiIdToTeam.get(apiId);
    if (!team) { console.warn(`  Team: API ID ${apiId} not found in DB, skipping`); continue; }
    if (team.name === override.name && team.shortName === override.shortName) continue;

    const { error } = await supabase
      .from('teams')
      .update({ name: override.name, short_name: override.shortName })
      .eq('id', team.dbId);
    if (error) { console.error(`  Failed to update team ${apiId}:`, error.message); continue; }
    console.log(`  Team ${apiId}: "${team.name}" → "${override.name}"`);
    updatedTeams++;
  }

  // Summary
  console.log(`\nDone: ${updatedNames} ground names, ${updatedImages} ground images, ${updatedTeams} teams updated`);
}

main();
