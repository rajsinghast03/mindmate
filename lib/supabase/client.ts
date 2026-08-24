import { createBrowserClient } from '@supabase/ssr';

import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/config';

export function createClient() {
  return createBrowserClient(getSupabaseUrl()!, getSupabasePublishableKey()!);
}

let channelSequence = 0;

/**
 * A Realtime channel topic that is never reused.
 *
 * `createBrowserClient` is memoized, so every caller shares one socket, and
 * `RealtimeClient.channel()` dedupes by topic while `removeChannel()` leaves
 * asynchronously. Under React Strict Mode's mount/unmount/remount the second
 * subscription therefore joins the same topic the first one is still leaving, and
 * the late leave tears down the server-side subscription — the channel reports
 * SUBSCRIBED and then silently receives nothing. A fresh topic per mount keeps the
 * two lifecycles from touching each other.
 */
export function uniqueChannelName(prefix: string): string {
  channelSequence += 1;
  return `${prefix}#${channelSequence}`;
}
