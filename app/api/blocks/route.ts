import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';
import { loadViewer } from '@/lib/matching/match-service';
import { CANDIDATE_COLUMNS, DbCandidate, toCandidateSummary } from '@/lib/supabase/match-mapper';

/**
 * Blocking someone.
 *
 * The block row itself is written through the caller's own client so the blocks
 * policy stays the enforcement point — it only passes when blocker_profile_id is
 * the caller's own profile. Ending the match afterwards needs the service role,
 * because migration 005 removed the client's ability to move a match's status.
 *
 * Discovery needs no extra work: match_candidate_profiles already excludes any
 * pair with a block in either direction, so a blocked person cannot resurface.
 */

const ACTIVE = ['suggested', 'requested', 'connected'];

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ blocks: [] });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const result = await loadViewer();
  if (!result.ok) {
    if (result.status === 404) return NextResponse.json({ blocks: [] });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('blocks')
    .select('id, blocked_profile_id, created_at')
    .eq('blocker_profile_id', result.viewer.profileId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows?.length) return NextResponse.json({ blocks: [] });

  // Names come from the service client: blocked profiles sit outside the caller's
  // own-row-only policy, and this deliberately reveals nothing a block does not
  // already imply the caller knows.
  const service = createServiceClient();
  const { data: profiles } = await service
    .from('profiles')
    .select(CANDIDATE_COLUMNS)
    .in(
      'id',
      rows.map(r => r.blocked_profile_id)
    );

  const byId = new Map((profiles ?? []).map((p: DbCandidate) => [p.id, p]));

  return NextResponse.json({
    blocks: rows.flatMap(row => {
      const profile = byId.get(row.blocked_profile_id);
      if (!profile) return [];
      return [
        {
          id: row.id,
          createdAt: row.created_at,
          // false: never leak the raw Curiosity Profile of someone you blocked.
          profile: toCandidateSummary(profile, false),
        },
      ];
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  let profileId: string;
  try {
    const parsed = await req.json();
    profileId = typeof parsed?.profileId === 'string' ? parsed.profileId : '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { viewer } = result;

  if (profileId === viewer.profileId) {
    return NextResponse.json({ error: 'You cannot block yourself.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('blocks').upsert(
    { blocker_profile_id: viewer.profileId, blocked_profile_id: profileId },
    { onConflict: 'blocker_profile_id,blocked_profile_id' }
  );

  if (error) {
    return NextResponse.json({ error: 'Could not block this person.' }, { status: 403 });
  }

  // Close whatever is open between them. Any active status becomes unmatched, so
  // the thread locks (the messages policy requires status = 'connected') and the
  // pair drops out of both people's lists.
  const service = createServiceClient();
  await service
    .from('matches')
    .update({ status: 'unmatched' })
    .in('status', ACTIVE)
    .or(
      `and(profile_a_id.eq.${viewer.profileId},profile_b_id.eq.${profileId}),` +
        `and(profile_a_id.eq.${profileId},profile_b_id.eq.${viewer.profileId})`
    );

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const profileId = req.nextUrl.searchParams.get('profileId');
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_profile_id', result.viewer.profileId)
    .eq('blocked_profile_id', profileId);

  if (error) {
    return NextResponse.json({ error: 'Could not unblock this person.' }, { status: 403 });
  }

  // Unblocking does not restore the match — it only makes them eligible to be
  // suggested again, which is what the discovery RPC checks.
  return NextResponse.json({ success: true });
}
