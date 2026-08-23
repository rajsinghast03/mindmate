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
  curiosityProfile: string;
  profileEmbedding?: number[] | null;
  visibility: 'discoverable' | 'paused';
  curiosityTags?: string[];
  avatarInitial?: string;
  createdAt: string;
  updatedAt: string;
};

export type MatchStatus = 'suggested' | 'requested' | 'connected' | 'passed' | 'unmatched';

export type Match = {
  id: string;
  profileAId: string;
  profileBId: string;
  candidateProfile: Profile;
  score: number;
  explanation: string;
  sharedCuriosity: string;
  sharedQuestion: string;
  status: MatchStatus;
  requestedByProfileId: string | null;
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
  candidateProfile: Profile;
  sharedQuestion: string;
  resonanceSummary: string;
  messages: Message[];
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
