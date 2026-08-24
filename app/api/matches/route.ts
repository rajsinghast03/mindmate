import { NextResponse } from 'next/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';
import { loadMatchState, loadViewer } from '@/lib/matching/match-service';

/**
 * Every suggestion, pending request and open connection for the signed-in user.
 *
 * Counterpart raw profile text is included only for connected matches — the
 * redaction lives in toCandidateSummary (lib/supabase/match-mapper.ts).
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ matches: [], conversations: [], mode: 'local' });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const result = await loadViewer();
  if (!result.ok) {
    // No profile yet is a normal state during onboarding, not an error.
    if (result.status === 404) {
      return NextResponse.json({ matches: [], conversations: [] });
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const state = await loadMatchState(createServiceClient(), result.viewer.profileId);
    return NextResponse.json(state);
  } catch (error) {
    console.error('GET /api/matches failed:', error);
    return NextResponse.json({ error: 'Failed to load matches' }, { status: 500 });
  }
}
