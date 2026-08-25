import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { loadViewer } from '@/lib/matching/match-service';

/**
 * Mark a conversation read up to now.
 *
 * Written through the caller's own client so the conversation_reads policy
 * (migration 007) stays the enforcement point: the row must be theirs and they
 * must be a party to the conversation. No service role is involved, which is
 * why this route skips the isServiceRoleConfigured guard the sibling routes need.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { id: conversationId } = await params;

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const readAt = new Date().toISOString();

  const { error } = await (await createClient())
    .from('conversation_reads')
    .upsert(
      {
        conversation_id: conversationId,
        profile_id: result.viewer.profileId,
        last_read_at: readAt,
      },
      { onConflict: 'conversation_id,profile_id' }
    );

  if (error) {
    // A non-member hits the RLS check rather than a 404 lookup, so report it the
    // same way the message POST does rather than leaking whether the id exists.
    return NextResponse.json({ error: 'Could not update read state.' }, { status: 403 });
  }

  return NextResponse.json({ conversationId, lastReadAt: readAt });
}
