import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { loadViewer } from '@/lib/matching/match-service';

/**
 * Mark connection notifications seen.
 *
 * The body carries `through`: the newest matches.updated_at the notification
 * panel was showing. Marking up to that rather than up to "now" is what makes
 * opening the panel clear exactly what was on screen — a request that arrives
 * mid-round-trip has a later updated_at and survives. It is also the only value
 * that is safe to compare against, since it came from the database's clock
 * rather than this server's. The notification_reads_stamp trigger clamps it to
 * NOW() so it can never be pushed into the future.
 *
 * Written through the caller's own client so the notification_reads policy
 * (migration 013) stays the enforcement point — the row must be theirs. No
 * service role is involved, which is why this route skips the
 * isServiceRoleConfigured guard its sibling routes need.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Falls back to this server's clock only if a caller omits `through`. The app
  // always sends it; the fallback exists so a malformed body marks something
  // rather than failing outright.
  let through = new Date().toISOString();
  try {
    const body = await req.json();
    if (typeof body?.through === 'string' && !Number.isNaN(Date.parse(body.through))) {
      through = new Date(body.through).toISOString();
    }
  } catch {
    // No body, or not JSON. Keep the fallback.
  }

  const { data, error } = await (await createClient())
    .from('notification_reads')
    .upsert({ profile_id: result.viewer.profileId, last_seen_at: through }, {
      onConflict: 'profile_id',
    })
    .select('last_seen_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Could not update notification state.' }, { status: 403 });
  }

  // The stored value, after clamping — this is what a later load will compare
  // matches.updated_at against, so the client should adopt it verbatim.
  return NextResponse.json({ lastSeenAt: data.last_seen_at });
}
