/**
 * Seed the 8 demo personas as real users with real embeddings.
 *
 * They exist so a brand-new signup has someone to match with, and so the full
 * pipeline (pgvector retrieval -> re-rank -> LLM synthesis) runs end to end
 * against real rows. Their profiles carry is_demo = true, which drives
 * server-side auto-accept of connection requests and the UI's demo labelling.
 *
 * Idempotent: re-running updates the existing personas in place.
 *
 * Run: node scripts/seed-demo-profiles.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { requireServiceEnv } from './lib/env.mjs';
import { generateEmbedding } from './lib/embeddings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEMO_EMAIL_DOMAIN = 'demo.mindmate.site';
const DEMO_TIMEZONE = 'Asia/Kolkata';

const { url, serviceKey, ai } = requireServiceEnv();

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { inspirations } = JSON.parse(
  readFileSync(resolve(__dirname, '../data/seed-profiles.json'), 'utf8')
);

const demoEmail = (author) => `${author.toLowerCase()}@${DEMO_EMAIL_DOMAIN}`;

// One listing up front so re-runs don't fight createUser's duplicate-email error.
const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error(`❌ Could not list users: ${listError.message}`);
  process.exit(1);
}

const idByEmail = new Map(
  existingUsers.users.map((u) => [u.email?.toLowerCase(), u.id])
);

console.log(`Seeding ${inspirations.length} demo personas…`);

let failures = 0;

for (const persona of inspirations) {
  const email = demoEmail(persona.author);

  try {
    let userId = idByEmail.get(email);

    if (!userId) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { is_demo: true },
      });
      if (createError) throw new Error(createError.message);
      userId = created.user.id;
    }

    const embedding = await generateEmbedding(ai, persona.text);

    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        display_name: persona.author,
        age: persona.age,
        city_or_timezone: persona.city,
        iana_timezone: DEMO_TIMEZONE,
        curiosity_profile: persona.text,
        profile_embedding: embedding,
        visibility: 'discoverable',
        is_demo: true,
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) throw new Error(upsertError.message);
    console.log(`  ✓ ${persona.author} <${email}>`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${persona.author}: ${err.message}`);
  }
}

if (failures) {
  console.error(`\n❌ ${failures} of ${inspirations.length} failed.`);
  process.exit(1);
}

console.log(`\n✅ Seeded ${inspirations.length} demo personas.`);
console.log('   They are discoverable to any user whose profile has an embedding.');
