import { createClient } from '@supabase/supabase-js';

import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/config';

export const SERVICE_ROLE_MISSING =
  'Server is missing SUPABASE_SECRET_KEY. Add it to .env.local (Supabase Dashboard → Settings → API Keys → Secret keys → sb_secret_...) and restart.';

/**
 * Service-role client — bypasses RLS.
 *
 * Needed wherever the server must act across users: reading candidate profiles the
 * caller has no policy for, inserting match and conversation rows (neither table
 * grants clients INSERT), and moving a match's status. Clients deliberately have no
 * write path to match status; see supabase/migrations/005_phase3_matching.sql.
 *
 * Only ever call this from route handlers, never from a component.
 */
export function createServiceClient() {
  const url = getSupabaseUrl()!;
  const key = getSupabaseServiceKey();

  // Falling back to the publishable key here would silently hit RLS and surface as
  // confusing "Invalid API key" / empty-result bugs. Fail with something readable.
  if (!key) throw new Error(SERVICE_ROLE_MISSING);

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
