import { createClient } from '@/lib/supabase/server';
import {
  CANDIDATE_COLUMNS,
  DbCandidate,
  DbMatch,
  counterpartId,
  dbMatchToMatch,
} from '@/lib/supabase/match-mapper';
import { DbMessage, dbMessageToMessage } from '@/lib/supabase/message-mapper';
import { Conversation, Match, Profile } from '@/types';

/** Statuses a user should still see. `passed` and `unmatched` are terminal. */
export const ACTIVE_MATCH_STATUSES = ['suggested', 'requested', 'connected'];

export type ViewerProfile = {
  userId: string;
  profileId: string;
  displayName: string;
  age: number;
  cityOrTimezone: string;
  ianaTimezone: string | null;
  curiosityProfile: string;
  visibility: 'discoverable' | 'paused';
  embedding: number[] | null;
  createdAt: string;
};

export type ViewerResult =
  | { ok: true; viewer: ViewerProfile }
  | { ok: false; status: number; error: string };

/**
 * PostgREST serialises a `vector` column as its text form ("[0.1,0.2,…]").
 * Normalise to a real array so callers can pass it straight back as an RPC arg.
 */
export function parseEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value)) return value as number[];
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as number[]) : null;
  } catch {
    return null;
  }
}

/** Resolve the signed-in user's own profile. Reads through RLS — own row only. */
export async function loadViewer(): Promise<ViewerResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, age, city_or_timezone, iana_timezone, curiosity_profile, visibility, profile_embedding, created_at'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: 'No profile yet' };

  return {
    ok: true,
    viewer: {
      userId: user.id,
      profileId: data.id,
      displayName: data.display_name,
      age: data.age,
      cityOrTimezone: data.city_or_timezone,
      ianaTimezone: data.iana_timezone,
      curiosityProfile: data.curiosity_profile,
      visibility: data.visibility,
      embedding: parseEmbedding(data.profile_embedding),
      createdAt: data.created_at,
    },
  };
}

/** Shape the viewer's own profile for the re-ranker, which compares two Profiles. */
export function viewerAsProfile(viewer: ViewerProfile): Profile {
  return {
    id: viewer.profileId,
    userId: viewer.userId,
    displayName: viewer.displayName,
    age: viewer.age,
    cityOrTimezone: viewer.cityOrTimezone,
    ianaTimezone: viewer.ianaTimezone,
    curiosityProfile: viewer.curiosityProfile,
    visibility: viewer.visibility,
    createdAt: viewer.createdAt,
    updatedAt: viewer.createdAt,
  };
}

type ServiceClient = ReturnType<typeof import('@/lib/supabase/service').createServiceClient>;

/**
 * Every match the viewer should see, with counterpart details and (once
 * connected) the conversation id. Runs on the service client because candidate
 * profiles sit outside the caller's own-row-only RLS policy.
 */
export async function loadActiveMatches(
  service: ServiceClient,
  profileId: string
): Promise<Match[]> {
  const { data: rows, error } = await service
    .from('matches')
    .select('*')
    .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`)
    .in('status', ACTIVE_MATCH_STATUSES)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const matchRows = rows as DbMatch[];
  const counterpartIds = [...new Set(matchRows.map((r) => counterpartId(r, profileId)))];

  const { data: candidates, error: candidateError } = await service
    .from('profiles')
    .select(CANDIDATE_COLUMNS)
    .in('id', counterpartIds);

  if (candidateError) throw new Error(candidateError.message);

  const candidateById = new Map<string, DbCandidate>(
    (candidates ?? []).map((c: DbCandidate) => [c.id, c])
  );

  const connectedMatchIds = matchRows.filter((r) => r.status === 'connected').map((r) => r.id);
  const conversationByMatch = new Map<string, string>();

  if (connectedMatchIds.length) {
    const { data: conversations, error: conversationError } = await service
      .from('conversations')
      .select('id, match_id')
      .in('match_id', connectedMatchIds);

    if (conversationError) throw new Error(conversationError.message);
    for (const c of conversations ?? []) conversationByMatch.set(c.match_id, c.id);
  }

  return matchRows.flatMap((row) => {
    const candidate = candidateById.get(counterpartId(row, profileId));
    if (!candidate) return [];
    return [dbMatchToMatch(row, profileId, candidate, conversationByMatch.get(row.id) ?? null)];
  });
}

type ConversationSummary = {
  messageCount: number;
  unreadCount: number;
  lastMessage: DbMessage | null;
  lastActivityAt: string | null;
};

/** Row shape of the conversation_summaries RPC (migration 007). */
type DbConversationSummary = {
  conversation_id: string;
  message_count: number | string;
  unread_count: number | string;
  last_message_id: string | null;
  last_message_body: string | null;
  last_message_sender: string | null;
  last_message_at: string | null;
};

/**
 * Latest message, total count and unread count per conversation, for the inbox.
 *
 * One round trip: the RPC does DISTINCT ON for the last message and a FILTER'd
 * count against conversation_reads.last_read_at for the unread tally. It is
 * SECURITY DEFINER and REVOKE'd from `authenticated`, so it must be called on
 * the service client.
 *
 * Postgres returns BIGINT counts, which PostgREST may serialise as strings.
 */
async function loadConversationSummaries(
  service: ServiceClient,
  profileId: string
): Promise<Map<string, ConversationSummary>> {
  const summaries = new Map<string, ConversationSummary>();

  const { data, error } = await service.rpc('conversation_summaries', {
    target_profile_id: profileId,
  });

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as DbConversationSummary[]) {
    const lastMessage: DbMessage | null =
      row.last_message_id && row.last_message_at && row.last_message_sender
        ? {
            id: row.last_message_id,
            conversation_id: row.conversation_id,
            sender_profile_id: row.last_message_sender,
            body: row.last_message_body ?? '',
            created_at: row.last_message_at,
          }
        : null;

    summaries.set(row.conversation_id, {
      messageCount: Number(row.message_count) || 0,
      unreadCount: Number(row.unread_count) || 0,
      lastMessage,
      lastActivityAt: row.last_message_at,
    });
  }

  return summaries;
}

/**
 * When this viewer last opened the notification panel; null if they never have.
 * The bell treats a match whose updatedAt is later than this as unseen.
 */
async function loadNotificationsSeenAt(
  service: ServiceClient,
  profileId: string
): Promise<string | null> {
  const { data, error } = await service
    .from('notification_reads')
    .select('last_seen_at')
    .eq('profile_id', profileId)
    .maybeSingle();

  // Never seeing the panel is the normal first-run state, and a failure here
  // should not take down the whole match state — the bell just shows everything
  // as unseen, which is the safe direction to be wrong in.
  if (error) return null;
  return data?.last_seen_at ?? null;
}

export type MatchState = {
  matches: Match[];
  conversations: Conversation[];
  notificationsSeenAt: string | null;
};

/**
 * The single read the client needs: active matches plus the conversation list
 * derived from the connected ones. Full message threads are fetched per-chat.
 */
export async function loadMatchState(
  service: ServiceClient,
  profileId: string
): Promise<MatchState> {
  // The summary RPC is keyed only on the viewer, so it does not need to wait for
  // the match rows. Running both together saves a round trip on every load; the
  // cost is one wasted RPC for a user with no connections, which is concurrent
  // and so free in wall time.
  const [matches, summaries, notificationsSeenAt] = await Promise.all([
    loadActiveMatches(service, profileId),
    loadConversationSummaries(service, profileId),
    loadNotificationsSeenAt(service, profileId),
  ]);

  const connected = matches.filter((m) => m.status === 'connected' && m.conversationId);

  const conversations: Conversation[] = connected
    .map((match) => {
      const summary = summaries.get(match.conversationId as string);
      const lastMessage = summary?.lastMessage ? dbMessageToMessage(summary.lastMessage) : null;

      return {
        id: match.conversationId as string,
        matchId: match.id,
        candidateProfile: match.candidateProfile,
        sharedQuestion: match.sharedQuestion,
        resonanceSummary: match.explanation,
        messages: lastMessage ? [lastMessage] : [],
        messageCount: summary?.messageCount ?? 0,
        unreadCount: summary?.unreadCount ?? 0,
        createdAt: match.createdAt,
        lastActivityAt: summary?.lastActivityAt ?? match.createdAt,
      };
    })
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));

  return { matches, conversations, notificationsSeenAt };
}
