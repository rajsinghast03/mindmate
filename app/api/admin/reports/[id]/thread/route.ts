import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { isAdminEmail, isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';

/**
 * The messages behind a report.
 *
 * Deliberately keyed on the *report*, not the conversation. An admin cannot ask
 * for an arbitrary thread — only one someone has actually flagged to them, and
 * only the conversation that report was filed from. Reading private messages is a
 * real capability, and this is the narrowest shape that still lets a moderator
 * judge what happened.
 *
 * Runs on the service role because the messages policy scopes reads to the two
 * participants, which a moderator is not.
 */

const NOT_FOUND = NextResponse.json({ error: 'Not found' }, { status: 404 });

/** Enough context to judge a report without dumping an entire long thread. */
const MESSAGE_LIMIT = 200;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) return NOT_FOUND;

  const { id } = await params;
  const service = createServiceClient();

  const { data: report } = await service
    .from('reports')
    .select('id, conversation_id, reported_profile_id, reporter_profile_id')
    .eq('id', id)
    .maybeSingle();

  if (!report) return NOT_FOUND;

  // A report filed from the profile rather than a conversation has no thread.
  if (!report.conversation_id) {
    return NextResponse.json({ messages: [], reason: 'no_conversation' });
  }

  const { data: rows, error } = await service
    .from('messages')
    .select('id, sender_profile_id, body, created_at')
    .eq('conversation_id', report.conversation_id)
    .order('created_at', { ascending: true })
    .limit(MESSAGE_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const senderIds = [...new Set((rows ?? []).map(r => r.sender_profile_id))];
  const { data: profiles } = senderIds.length
    ? await service.from('profiles').select('id, display_name').in('id', senderIds)
    : { data: [] };

  const nameById = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name])
  );

  return NextResponse.json({
    messages: (rows ?? []).map(row => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      senderId: row.sender_profile_id,
      senderName: nameById.get(row.sender_profile_id) ?? 'Deleted profile',
      // Which side of the report this message is from, so a moderator is not
      // matching UUIDs by eye.
      isReported: row.sender_profile_id === report.reported_profile_id,
    })),
  });
}
