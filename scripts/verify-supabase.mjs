/**
 * Verify Supabase connection after filling in .env.local
 * Run: node scripts/verify-supabase.mjs
 */

import { loadEnv } from './lib/env.mjs';

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || url.includes('your-project')) {
  console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (
  !publishableKey ||
  publishableKey.includes('your_publishable') ||
  publishableKey.includes('your_anon_key')
) {
  console.error('❌ Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
  console.error('   Find it under Dashboard → Settings → API Keys');
  process.exit(1);
}

console.log('Checking Supabase connection…');
console.log(`  URL: ${url}`);

// Note: /rest/v1/ root requires secret key; test via a table query instead.
const tableRes = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
  headers: {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  },
});

const tableBody = await tableRes.text();

if (tableRes.status === 401 || tableRes.status === 403) {
  console.error(`❌ Invalid publishable key (HTTP ${tableRes.status})`);
  console.error('   Check NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
  process.exit(1);
}

if (tableBody.includes('Could not find the table') || tableBody.includes('PGRST205')) {
  console.log('✅ Publishable key is valid');
  console.log('');
  console.log('⚠️  profiles table not found — run the migration next:');
  console.log('   Open Supabase Dashboard → SQL Editor');
  console.log('   Paste contents of supabase/migrations/001_initial_schema.sql');
  console.log('   Click Run');
  process.exit(0);
}

if (!tableRes.ok) {
  console.error(`❌ Unexpected error (HTTP ${tableRes.status}): ${tableBody}`);
  process.exit(1);
}

console.log('✅ Publishable key is valid');
console.log('✅ profiles table exists — database migration is applied');
console.log('');
console.log('Next steps:');
console.log('  1. In Supabase Dashboard → Authentication → URL Configuration');
console.log('     Site URL:      http://localhost:3000');
console.log('     Redirect URLs: http://localhost:3000/auth/callback');
console.log('                    http://localhost:3000/auth/confirm');
console.log('  2. Authentication → Providers → Email: enable, Confirm email ON');
console.log('  3. Authentication → Providers → Google: enable with a Google Cloud client');
console.log('  4. Authentication → Emails → Templates: paste supabase/templates/*.html');
console.log('  5. Run: npm run dev');
console.log('  6. Visit http://localhost:3000 and complete onboarding');
