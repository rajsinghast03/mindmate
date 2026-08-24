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
  lastMessage: DbMessage | null;
  lastActivityAt: string | null;
};

/**
 * Latest message and total count per conversation, for the connections list.
 *
 * Fetches the threads and reduces in memory — fine at the volumes this app will
 * see for a long while. If message counts ever grow, promote this to a view or an
 * RPC doing DISTINCT ON (conversation_id).
 */
async function loadConversationSummaries(
  service: ServiceClient,
  conversationIds: string[]
): Promise<Map<string, ConversationSummary>> {
  const summaries = new Map<string, ConversationSummary>();
  if (!conversationIds.length) return summaries;

  const { data, error } = await service
    .from('messages')
    .select('id, conversation_id, sender_profile_id, body, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as DbMessage[]) {
    const existing = summaries.get(row.conversation_id);
    summaries.set(row.conversation_id, {
      messageCount: (existing?.messageCount ?? 0) + 1,
      lastMessage: row,
      lastActivityAt: row.created_at,
    });
  }

  return summaries;
}

export type MatchState = {
  matches: Match[];
  conversations: Conversation[];
};

/**
 * The single read the client needs: active matches plus the conversation list
 * derived from the connected ones. Full message threads are fetched per-chat.
 */
export async function loadMatchState(
  service: ServiceClient,
  profileId: string
): Promise<MatchState> {
  const matches = await loadActiveMatches(service, profileId);

  const connected = matches.filter((m) => m.status === 'connected' && m.conversationId);
  const summaries = await loadConversationSummaries(
    service,
    connected.map((m) => m.conversationId as string)
  );

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
        createdAt: match.createdAt,
        lastActivityAt: summary?.lastActivityAt ?? match.createdAt,
      };
    })
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));

  return { matches, conversations };
}
