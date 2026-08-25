import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';
import { loadViewer } from '@/lib/matching/match-service';
import {
  CANDIDATE_COLUMNS,
  DbCandidate,
  DbMatch,
  counterpartId,
  isParty,
  toCandidateSummary,
} from '@/lib/supabase/match-mapper';
import {
  DbMessage,
  MESSAGE_MAX_LENGTH,
  dbMessageToMessage,
} from '@/lib/supabase/message-mapper';
import { pickDemoReply } from '@/lib/matching/demo-replies';
import { Conversation } from '@/types';

type ServiceClient = ReturnType<typeof createServiceClient>;

type ConversationContext = {
  matchId: string;
  createdAt: string;
  match: DbMatch;
  candidate: DbCandidate;
};

/**
 * Resolve a conversation the caller belongs to.
 *
 * The membership check is the RLS policy itself: the conversations SELECT policy
 * only exposes rows whose match includes the caller's profile, so a non-member
 * simply gets nothing back here.
 */
async function loadContext(
  service: ServiceClient,
  userScoped: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  viewerProfileId: string
): Promise<ConversationContext | null> {
  const { data: conversation } = await userScoped
    .from('conversations')
    .select('id, match_id, created_at')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conversation) return null;

  const { data: matchRow } = await service
    .from('matches')
    .select('*')
    .eq('id', conversation.match_id)
    .maybeSingle();

  if (!matchRow || !isParty(matchRow as DbMatch, viewerProfileId)) return null;

  const match = matchRow as DbMatch;

  const { data: candidate } = await service
    .from('profiles')
    .select(CANDIDATE_COLUMNS)
    .eq('id', counterpartId(match, viewerProfileId))
    .maybeSingle();

  if (!candidate) return null;

  return {
    matchId: match.id,
    createdAt: conversation.created_at,
    match,
    candidate: candidate as DbCandidate,
  };
}

/** Page size for the thread. The client scrolls up to pull older pages. */
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function readPageSize(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const { id: conversationId } = await params;

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const supabase = await createClient();
  const service = createServiceClient();
  const context = await loadContext(service, supabase, conversationId, result.viewer.profileId);

  if (!context) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const limit = readPageSize(req.nextUrl.searchParams.get('limit'));
  const before = req.nextUrl.searchParams.get('before');

  // Newest-first with one extra row: the extra is how we know there is another
  // page without a second count query. Reversed to ascending before mapping.
  //
  // The cursor is `created_at` alone. timestamptz is microsecond-resolution, so
  // two messages in one conversation sharing an instant is not a real scenario;
  // a composite (created_at, id) keyset would cost the index scan for nothing.
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (before) query = query.lt('created_at', before);

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const page = (rows ?? []) as DbMessage[];
  const hasMore = page.length > limit;
  const messages = page
    .slice(0, limit)
    .reverse()
    .map((row) => dbMessageToMessage(row));

  // messageCount must stay the thread total, not the page length — the inbox
  // and the header both read it.
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  // When the counterpart last read this thread — the authoritative read receipt.
  // The live updates arrive over the conversation's broadcast channel, but
  // broadcast is ephemeral, so this is what the client falls back to on load and
  // on every resync.
  const { data: peerRead } = await service
    .from('conversation_reads')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('profile_id', context.candidate.id)
    .maybeSingle();

  // Reaching here means the match is connected, so the raw profile is unlocked.
  const conversation: Conversation = {
    id: conversationId,
    matchId: context.matchId,
    candidateProfile: toCandidateSummary(context.candidate, true),
    sharedQuestion: context.match.shared_question,
    resonanceSummary: context.match.explanation,
    messages,
    messageCount: count ?? messages.length,
    // Unread is owned by the inbox query; a thread you are looking at is read.
    unreadCount: 0,
    createdAt: context.createdAt,
    lastActivityAt: messages.at(-1)?.createdAt ?? context.createdAt,
  };

  return NextResponse.json({
    conversation,
    peerLastReadAt: peerRead?.last_read_at ?? null,
    page: { hasMore, oldestCursor: messages[0]?.createdAt ?? null },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const { id: conversationId } = await params;

  let text: string;
  try {
    const parsed = await req.json();
    text = typeof parsed?.body === 'string' ? parsed.body.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
  }

  if (text.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Messages are limited to ${MESSAGE_MAX_LENGTH.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { viewer } = result;
  const supabase = await createClient();
  const service = createServiceClient();

  // Insert through the caller's own client so the messages policy stays the
  // enforcement point: it rejects writes unless the match is connected and
  // sender_profile_id is genuinely theirs.
  const { data: inserted, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_profile_id: viewer.profileId,
      body: text,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: 'Could not send this message. The connection may no longer be active.' },
      { status: 403 }
    );
  }

  const message = dbMessageToMessage(inserted as DbMessage);

  // Seeded personas reply so a solo user can experience a real thread. Written with
  // the service client because a demo persona has no session of its own.
  let reply = null;
  const context = await loadContext(service, supabase, conversationId, viewer.profileId);

  if (context?.candidate.is_demo) {
    const { data: replyRow } = await service
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_profile_id: context.candidate.id,
        body: pickDemoReply(),
      })
      .select('*')
      .single();

    if (replyRow) reply = dbMessageToMessage(replyRow as DbMessage);
  }

  return NextResponse.json({ message, reply });
}
