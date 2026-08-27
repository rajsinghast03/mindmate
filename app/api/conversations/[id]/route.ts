import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { loadViewer } from '@/lib/matching/match-service';

/**
 * Remove a conversation from the caller's inbox.
 *
 * Deliberately not a delete. conversations.match_id cascades to messages, so
 * destroying the row would take the other person's copy of the thread with it —
 * something one party should not be able to do to the other. This writes a hide
 * mark instead (migration 016); the thread returns, carrying only what is new,
 * if they write again.
 *
 * Written through the caller's own client so the conversation_hides policy is the
 * enforcement point: the row must be theirs, and they must be a party to that
 * conversation. No service client is involved, so a forged profile_id fails at
 * the database rather than relying on this handler to check.
 */
export async function DELETE(
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

  const supabase = await createClient();

  // Upsert rather than insert: deleting a thread that came back and was read
  // again has to move the mark forward, not collide with the old one.
  const { error } = await supabase
    .from('conversation_hides')
    .upsert(
      {
        conversation_id: conversationId,
        profile_id: result.viewer.profileId,
        hidden_at: new Date().toISOString(),
      },
      { onConflict: 'conversation_id,profile_id' }
    );

  if (error) {
    return NextResponse.json(
      { error: 'Could not remove this conversation.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
