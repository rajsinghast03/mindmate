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

const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation, raised by messages_conversation_client_id_key. */
const UNIQUE_VIOLATION = '23505';

type ConversationContext = {
  matchId: string;
  createdAt: string;
  match: DbMatch;
  candidate: DbCandidate;
};


/**
 * When this viewer last removed the thread from their inbox, or null if never.
 *
 * A conversation deleted and then revived by a new message shows only what was
 * said after the delete — reviving the old messages would hand back exactly what
 * the person asked to be rid of. Migration 016.
 */
async function loadHiddenAt(
  userScoped: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  viewerProfileId: string
): Promise<string | null> {
  const { data } = await userScoped
    .from('conversation_hides')
    .select('hidden_at')
    .eq('conversation_id', conversationId)
    .eq('profile_id', viewerProfileId)
    .maybeSingle();

  return data?.hidden_at ?? null;
}

/** Page size for the thread. The client scrolls up to pull older pages. */
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function readPageSize(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

/**
 * Resolve the conversation and its match in one round trip.
 *
 * The membership check is the RLS policy itself: the conversations SELECT policy
 * only exposes rows whose match includes the caller's profile, so a non-member
 * simply gets nothing back here. The match is embedded rather than fetched
 * separately, which is why this reads through the caller's client and not the
 * service one.
 */
async function loadConversationMatch(
  userScoped: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  viewerProfileId: string
): Promise<{ match: DbMatch; createdAt: string } | null> {
  const { data } = await userScoped
    .from('conversations')
    .select('id, match_id, created_at, matches(*)')
    .eq('id', conversationId)
    .maybeSingle();

  const match = (data?.matches ?? null) as DbMatch | null;
  if (!data || !match || !isParty(match, viewerProfileId)) return null;

  return { match, createdAt: data.created_at };
}

/** The counterpart's approved profile, for the thread header and dossier. */
async function loadCandidate(
  service: ServiceClient,
  profileId: string
): Promise<DbCandidate | null> {
  const { data } = await service
    .from('profiles')
    .select(CANDIDATE_COLUMNS)
    .eq('id', profileId)
    .maybeSingle();

  return (data as DbCandidate) ?? null;
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
  const viewerProfileId = result.viewer.profileId;

  const limit = readPageSize(req.nextUrl.searchParams.get('limit'));
  const before = req.nextUrl.searchParams.get('before');

  // Wave 1: the membership check and the hide mark need nothing from each other.
  const [base, hiddenAt] = await Promise.all([
    loadConversationMatch(supabase, conversationId, viewerProfileId),
    loadHiddenAt(supabase, conversationId, viewerProfileId),
  ]);

  if (!base) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // The counterpart's id comes off the match row itself, so the read receipt does
  // not have to wait for their profile to load.
  const candidateId = counterpartId(base.match, viewerProfileId);

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
  // Bounds the "load earlier" paging too, so scrolling up cannot walk back past
  // the delete into messages this viewer removed.
  if (hiddenAt) query = query.gt('created_at', hiddenAt);

  // Wave 2: four independent reads. These used to run one after another, which is
  // most of what made opening a thread slow.
  //
  // `count` must stay the thread total, not the page length — the inbox and the
  // header both read it. `peerRead` is the authoritative read receipt: live updates
  // ride the conversation's broadcast channel, but broadcast is ephemeral, so this
  // is the fallback on load and on every resync.
  const [
    { data: rows, error },
    { count },
    { data: peerRead },
    candidate,
  ] = await Promise.all([
    query,
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId),
    service
      .from('conversation_reads')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('profile_id', candidateId)
      .maybeSingle(),
    loadCandidate(service, candidateId),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!candidate) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const page = (rows ?? []) as DbMessage[];
  const hasMore = page.length > limit;
  const messages = page
    .slice(0, limit)
    .reverse()
    .map((row) => dbMessageToMessage(row));

  // Reaching here means the match is connected, so the raw profile is unlocked.
  const conversation: Conversation = {
    id: conversationId,
    matchId: base.match.id,
    candidateProfile: toCandidateSummary(candidate, true),
    sharedQuestion: base.match.shared_question,
    resonanceSummary: base.match.explanation,
    messages,
    messageCount: count ?? messages.length,
    // Unread is owned by the inbox query; a thread you are looking at is read.
    unreadCount: 0,
    createdAt: base.createdAt,
    lastActivityAt: messages.at(-1)?.createdAt ?? base.createdAt,
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
  let clientId: string | null = null;
  try {
    const parsed = await req.json();
    text = typeof parsed?.body === 'string' ? parsed.body.trim() : '';
    // Validated rather than trusted: it reaches a unique index, and anything that
    // is not a UUID would be rejected by the column type as a raw 500.
    clientId =
      typeof parsed?.clientId === 'string' && CLIENT_ID_PATTERN.test(parsed.clientId)
        ? parsed.clientId
        : null;
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
      client_id: clientId,
    })
    .select('*')
    .single();

  // A repeat of a send we already stored — a double-tap, or a retry after the
  // first response was lost. Return the original row instead of erroring, so the
  // caller settles its optimistic bubble against the message that really exists
  // rather than being told the send failed and offering to send it again.
  if (error?.code === UNIQUE_VIOLATION && clientId) {
    const { data: existing } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: dbMessageToMessage(existing as DbMessage), reply: null });
    }
  }

  if (error || !inserted) {
    return NextResponse.json(
      { error: 'Could not send this message. The connection may no longer be active.' },
      { status: 403 }
    );
  }

  const message = dbMessageToMessage(inserted as DbMessage);

  // Seeded personas reply so a solo user can experience a real thread. Written with
  // the service client because a demo persona has no session of its own.
  //
  // This used to walk conversations, matches and profiles on every
  // single send, to read one boolean. That is three round trips on the most
  // latency-visible action in the app, and for a real counterpart all three were
  // wasted. One targeted lookup instead, and the insert above has already proved
  // membership, so nothing is being skipped.
  let reply = null;
  const { data: pair } = await service
    .from('conversations')
    .select(
      'id, matches(profile_a_id, profile_b_id, a:profiles!profile_a_id(id, is_demo), b:profiles!profile_b_id(id, is_demo))'
    )
    .eq('id', conversationId)
    .maybeSingle();

  const match = (pair?.matches ?? null) as {
    profile_a_id: string;
    a: { id: string; is_demo: boolean } | null;
    b: { id: string; is_demo: boolean } | null;
  } | null;

  const counterpart = match
    ? match.profile_a_id === viewer.profileId
      ? match.b
      : match.a
    : null;

  if (counterpart?.is_demo) {
    const { data: replyRow } = await service
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_profile_id: counterpart.id,
        body: pickDemoReply(),
      })
      .select('*')
      .single();

    if (replyRow) reply = dbMessageToMessage(replyRow as DbMessage);
  }

  return NextResponse.json({ message, reply });
}
