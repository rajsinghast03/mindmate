import { CandidateSummary, Match, MatchDirection, MatchStatus } from '@/types';

export type DbMatch = {
  id: string;
  profile_a_id: string;
  profile_b_id: string;
  score: number;
  explanation: string;
  shared_curiosity: string;
  shared_question: string;
  status: MatchStatus;
  requested_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCandidate = {
  id: string;
  display_name: string;
  age: number;
  city_or_timezone: string;
  iana_timezone: string | null;
  curiosity_profile: string;
  is_demo: boolean;
  created_at?: string;
};

/** Columns a candidate summary needs — keep in sync with DbCandidate. */
export const CANDIDATE_COLUMNS =
  'id, display_name, age, city_or_timezone, iana_timezone, curiosity_profile, is_demo, created_at';

/**
 * The pair key is canonical (smaller uuid first) so `unique_profile_pair` actually
 * prevents a duplicate reverse row when two people generate suggestions for each
 * other at the same moment. Who initiated is carried by requested_by_profile_id,
 * never by column position.
 */
export function canonicalPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

export function counterpartId(row: DbMatch, viewerProfileId: string): string {
  return row.profile_a_id === viewerProfileId ? row.profile_b_id : row.profile_a_id;
}

export function isParty(row: DbMatch, viewerProfileId: string): boolean {
  return row.profile_a_id === viewerProfileId || row.profile_b_id === viewerProfileId;
}

export function matchDirection(row: DbMatch, viewerProfileId: string): MatchDirection {
  if (row.status !== 'requested' || !row.requested_by_profile_id) return null;
  return row.requested_by_profile_id === viewerProfileId ? 'outgoing' : 'incoming';
}

/**
 * @param revealRawProfile Pass true only for connected matches — the raw approved
 *   text stays hidden until both people opt in (ARCHITECTURE.md §3).
 */
export function toCandidateSummary(
  row: DbCandidate,
  revealRawProfile: boolean
): CandidateSummary {
  return {
    id: row.id,
    displayName: row.display_name,
    age: row.age,
    cityOrTimezone: row.city_or_timezone,
    ianaTimezone: row.iana_timezone,
    isDemo: Boolean(row.is_demo),
    ...(revealRawProfile ? { curiosityProfile: row.curiosity_profile } : {}),
  };
}

export function dbMatchToMatch(
  row: DbMatch,
  viewerProfileId: string,
  candidate: DbCandidate,
  conversationId: string | null = null
): Match {
  const connected = row.status === 'connected';

  return {
    id: row.id,
    profileAId: row.profile_a_id,
    profileBId: row.profile_b_id,
    candidateProfile: toCandidateSummary(candidate, connected),
    score: row.score,
    explanation: row.explanation,
    sharedCuriosity: row.shared_curiosity,
    sharedQuestion: row.shared_question,
    status: row.status,
    requestedByProfileId: row.requested_by_profile_id,
    direction: matchDirection(row, viewerProfileId),
    conversationId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
