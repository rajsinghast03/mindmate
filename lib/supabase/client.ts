import { createBrowserClient } from '@supabase/ssr';

import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/config';

export function createClient() {
  return createBrowserClient(getSupabaseUrl()!, getSupabasePublishableKey()!);
}
