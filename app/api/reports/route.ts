import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { loadViewer } from '@/lib/matching/match-service';
import { REPORT_CATEGORY_VALUES, REPORT_DETAILS_MAX_LENGTH } from '@/lib/moderation';

/**
 * File a report.
 *
 * Written through the caller's own client so the reports policy is the
 * enforcement point: migration 010 requires reporter_profile_id to resolve to
 * auth.uid(), replacing the 001 policy that also accepted a NULL reporter and so
 * allowed unlimited unattributable reports against anyone.
 *
 * The reported person can never read this — the SELECT policy is own-reports-only
 * — so recording who filed it costs the reporter no anonymity.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { profileId?: unknown; category?: unknown; details?: unknown; conversationId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const profileId = typeof body.profileId === 'string' ? body.profileId : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const details = typeof body.details === 'string' ? body.details.trim() : '';
  const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  if (!REPORT_CATEGORY_VALUES.includes(category)) {
    return NextResponse.json({ error: 'Choose a reason for the report.' }, { status: 400 });
  }

  if (details.length > REPORT_DETAILS_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Keep the details under ${REPORT_DETAILS_MAX_LENGTH.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { viewer } = result;

  if (profileId === viewer.profileId) {
    return NextResponse.json({ error: 'You cannot report yourself.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('reports').insert({
    reporter_profile_id: viewer.profileId,
    reported_profile_id: profileId,
    category,
    // `reason` is NOT NULL from 001. The category carries the classification, so
    // fall back to it when the reporter did not write anything.
    reason: details || category,
    conversation_id: conversationId,
  });

  if (error) {
    return NextResponse.json({ error: 'Could not file this report.' }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
