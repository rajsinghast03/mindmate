/**
 * Generate embeddings for any profile still missing one.
 *
 * Profiles can end up with a null embedding when OpenAI was unreachable during a
 * save (the API route degrades rather than failing the save). Such profiles never
 * surface as match candidates until this runs.
 *
 * Run: node scripts/backfill-embeddings.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { requireServiceEnv } from './lib/env.mjs';
import { generateEmbedding } from './lib/embeddings.mjs';

const { url, serviceKey, ai } = requireServiceEnv();

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: rows, error } = await supabase
  .from('profiles')
  .select('id, display_name, curiosity_profile')
  .is('profile_embedding', null);

if (error) {
  console.error(`❌ Could not read profiles: ${error.message}`);
  process.exit(1);
}

if (!rows.length) {
  console.log('✅ Every profile already has an embedding — nothing to do.');
  process.exit(0);
}

console.log(`Backfilling ${rows.length} profile(s)…`);

let failures = 0;

for (const row of rows) {
  try {
    const embedding = await generateEmbedding(ai, row.curiosity_profile);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_embedding: embedding })
      .eq('id', row.id);

    if (updateError) throw new Error(updateError.message);
    console.log(`  ✓ ${row.display_name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${row.display_name}: ${err.message}`);
  }
}

if (failures) {
  console.error(`\n❌ ${failures} of ${rows.length} failed. Re-run to retry just those.`);
  process.exit(1);
}

console.log(`\n✅ Backfilled ${rows.length} profile(s).`);
