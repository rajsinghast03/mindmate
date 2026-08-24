export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  age: number;
  cityOrTimezone: string;
  /** IANA timezone derived from the selected city/country, e.g. "Asia/Kolkata". */
  ianaTimezone?: string | null;
  curiosityProfile: string;
  profileEmbedding?: number[] | null;
  visibility: 'discoverable' | 'paused';
  curiosityTags?: string[];
  avatarInitial?: string;
  createdAt: string;
  updatedAt: string;
};

export type MatchStatus = 'suggested' | 'requested' | 'connected' | 'passed' | 'unmatched';

/**
 * Whose move it is on a `requested` match: `outgoing` means the viewer asked and is
 * waiting, `incoming` means someone asked the viewer and the decision is theirs.
 */
export type MatchDirection = 'incoming' | 'outgoing' | null;

/**
 * What the viewer is allowed to know about the person on the other side of a match.
 *
 * `curiosityProfile` is deliberately optional: the raw approved text is withheld until
 * the match reaches `connected`, per ARCHITECTURE.md §3 "Raw Profile Concealment".
 * Before that a viewer sees only the synthesized resonance, never the source text.
 */
export type CandidateSummary = {
  id: string;
  displayName: string;
  age: number;
  cityOrTimezone: string;
  ianaTimezone?: string | null;
  /** Seeded persona that auto-accepts requests; surfaced in the UI as such. */
  isDemo?: boolean;
  curiosityTags?: string[];
  curiosityProfile?: string;
};

export type Match = {
  id: string;
  profileAId: string;
  profileBId: string;
  candidateProfile: CandidateSummary;
  score: number;
  explanation: string;
  sharedCuriosity: string;
  sharedQuestion: string;
  status: MatchStatus;
  requestedByProfileId: string | null;
  direction?: MatchDirection;
  /** Set once mutually connected. */
  conversationId?: string | null;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderProfileId: string;
  body: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  matchId: string;
  candidateProfile: CandidateSummary;
  sharedQuestion: string;
  resonanceSummary: string;
  /** The full thread on the chat screen; just the latest entry in list views. */
  messages: Message[];
  /** Total in the thread — `messages` may hold only a preview. */
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
};

export type SampleCuriosityProfile = {
  title: string;
  author: string;
  age: number;
  city: string;
  text: string;
  keyTopics: string[];
};
