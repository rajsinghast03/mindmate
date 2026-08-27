'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Profile, Match, Conversation, Message } from '@/types';
import { SEED_PROFILES } from '@/data/seed-profiles';
import { reRankCandidates } from '@/lib/matching/reranker';
import { generateLocalResonance } from '@/lib/matching/local-resonance';
import { DEMO_REPLIES } from '@/lib/matching/demo-replies';
import { createClient, uniqueChannelName } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';
import { validateDisplayName } from '@/lib/validation/display-name';
import { clearOnboardingDraft } from '@/lib/onboarding-draft';

/**
 * Same check the server uses, so unfilled .env placeholders can't switch the client
 * into Supabase mode. NEXT_PUBLIC_* values are inlined at build time, so this
 * resolves identically during SSR and hydration.
 */
const SUPABASE_MODE = isSupabaseConfigured();

export type AuthUser = {
  id: string;
  email: string;
  /** Provider-supplied display name. Google sets it; password signups do not. */
  fullName?: string | null;
  /** Whether this address is on the moderation allowlist (server-evaluated). */
  isAdmin?: boolean;
};

interface MindmateContextType {
  userProfile: Profile | null;
  authUser: AuthUser | null;
  isSupabaseMode: boolean;
  setUserProfile: (profile: Profile | null) => void;
  matches: Match[];
  conversations: Conversation[];
  passedProfileIds: string[];
  isLoaded: boolean;
  /** True once the session is known, whether or not match state has arrived. */
  isSessionLoaded: boolean;
  saveProfile: (
    displayName: string,
    age: number,
    cityOrTimezone: string,
    curiosityProfile: string,
    ianaTimezone?: string | null
  ) => Promise<void>;
  /** Send or accept a connection request. Resolves to the match's new state. */
  connectMatch: (matchId: string) => Promise<Match | null>;
  passMatch: (matchId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => void;
  unmatchConversation: (conversationId: string) => Promise<void>;
  /** Clear the unread badge for a thread and persist the read mark. */
  markConversationRead: (conversationId: string) => void;
  /**
   * When this user last opened the notification panel, or null if never. The
   * bell counts a match whose `updatedAt` is later than this as unseen.
   */
  notificationsSeenAt: string | null;
  /**
   * Mark connection notifications seen up to `throughUpdatedAt` — pass the newest
   * `updatedAt` currently on screen, so opening the panel clears exactly what was
   * shown and nothing that arrives a moment later.
   */
  markNotificationsSeen: (throughUpdatedAt: string) => void;
  /**
   * The thread the user is currently looking at, if any. Registered by the chat
   * page so incoming messages there never light the badge.
   */
  setActiveConversationId: (conversationId: string | null) => void;
  togglePauseDiscovery: () => Promise<void>;
  resetAllData: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshCandidates: () => Promise<void>;
}

const STORAGE_KEY = 'mindmate_state_v1';

const MindmateContext = createContext<MindmateContextType | undefined>(undefined);

/**
 * Local demo mode only (no Supabase env vars). With Supabase configured, candidates
 * come from pgvector and resonance text is written once by the LLM synthesizer.
 */
function buildMatchesFromPool(userProfile: Profile, pool: Profile[], passedSet: Set<string>): Match[] {
  const scored = reRankCandidates(userProfile, pool, passedSet);
  return scored.slice(0, 3).map(sc => {
    const resonance = generateLocalResonance(userProfile, sc.candidate);
    return {
      id: `match-${sc.candidate.id}`,
      profileAId: userProfile.id,
      profileBId: sc.candidate.id,
      candidateProfile: {
        id: sc.candidate.id,
        displayName: sc.candidate.displayName,
        age: sc.candidate.age,
        cityOrTimezone: sc.candidate.cityOrTimezone,
        ianaTimezone: sc.candidate.ianaTimezone,
        curiosityTags: sc.candidate.curiosityTags,
        curiosityProfile: sc.candidate.curiosityProfile,
        isDemo: true,
      },
      score: sc.score,
      explanation: resonance.explanation,
      sharedCuriosity: resonance.sharedCuriosity,
      sharedQuestion: resonance.sharedQuestion,
      status: 'suggested' as const,
      requestedByProfileId: null,
      direction: null,
      conversationId: null,
      createdAt: new Date().toISOString(),
      // No transitions happen in local mode — status is mutated in place rather
      // than round-tripped — so the two stamps are always the same instant.
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Is `candidate` strictly later than `current`? Compared as instants rather than
 * strings: these timestamps come from two different columns, and PostgREST emits
 * fractional seconds only when a value has them, so "…:00+00:00" and
 * "…:00.5+00:00" do not sort correctly as text. A null `current` means no mark
 * has been set yet, so anything is later.
 */
function isLater(candidate: string | null, current: string | null): boolean {
  if (!candidate) return false;
  if (!current) return true;
  return Date.parse(candidate) > Date.parse(current);
}

export function MindmateProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [passedProfileIds, setPassedProfileIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  /**
   * Just "we know who you are" — set as soon as /api/profile lands, without
   * waiting for match state. `isLoaded` still means everything is ready and is
   * what the pages gate on; this is for chrome that only needs the session.
   */
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [notificationsSeenAt, setNotificationsSeenAt] = useState<string | null>(null);

  // Guards the top-up call so a re-render storm can't fire several generations.
  const generating = useRef(false);

  // Held in a ref, not state: only applyState reads it, and re-rendering the whole
  // tree because the user opened a thread would be wasteful.
  const activeConversationId = useRef<string | null>(null);

  const applyState = useCallback(
    (payload: {
      matches?: Match[];
      conversations?: Conversation[];
      notificationsSeenAt?: string | null;
    }) => {
      if (payload.matches) setMatches(payload.matches);
      // Never move the mark backwards. The optimistic write in
      // markNotificationsSeen lands before its POST does, and a refetch racing
      // in between would otherwise carry the pre-write value and re-light the
      // badge the user just cleared.
      const incomingSeenAt = payload.notificationsSeenAt;
      if (incomingSeenAt !== undefined) {
        setNotificationsSeenAt(prev => (isLater(incomingSeenAt, prev) ? incomingSeenAt : prev));
      }
      if (payload.conversations) {
        // The thread on screen is read by definition. Without this the badge
        // blips to 1 and back on every arrival: the provider's message listener
        // refetches before the read mark round-trips.
        const active = activeConversationId.current;
        setConversations(
          active
            ? payload.conversations.map(c =>
                c.id === active ? { ...c, unreadCount: 0 } : c
              )
            : payload.conversations
        );
      }
    },
    []
  );

  const setActiveConversationId = useCallback((conversationId: string | null) => {
    activeConversationId.current = conversationId;
  }, []);

  // The chat page calls markConversationRead on every arrival, so the write is
  // coalesced; the optimistic half below is not, or opening a thread would lag.
  const readTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /**
   * Zero the badge immediately, then persist. The optimistic half is what makes
   * opening a thread feel instant; the POST is what makes it survive a reload.
   */
  const markConversationRead = useCallback((conversationId: string) => {
    setConversations(prev =>
      prev.some(c => c.id === conversationId && c.unreadCount > 0)
        ? prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        : prev
    );

    if (!SUPABASE_MODE) return;

    const timers = readTimers.current;
    const existing = timers.get(conversationId);
    if (existing) clearTimeout(existing);

    timers.set(
      conversationId,
      setTimeout(() => {
        timers.delete(conversationId);
        void fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {
          // Best-effort: a failed mark just means the badge returns on the next fetch.
        });
      }, 500)
    );
  }, []);

  useEffect(() => {
    const timers = readTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  /**
   * Clear the bell, then persist.
   *
   * The optimistic value is the newest `updatedAt` the panel was showing, not
   * `Date.now()`. Both matter: the badge has to clear on the same frame the panel
   * opens, and using the data's own clock means it clears exactly the items that
   * were on screen — a request arriving during the round-trip has a later
   * `updatedAt` and survives. The server's reply then replaces it with the
   * database's NOW(), which is the value that has to be right, since it is what
   * `updatedAt` is compared against after a reload.
   */
  const markNotificationsSeen = useCallback((throughUpdatedAt: string) => {
    setNotificationsSeenAt(prev => (isLater(throughUpdatedAt, prev) ? throughUpdatedAt : prev));

    if (!SUPABASE_MODE) return;

    void fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ through: throughUpdatedAt }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.lastSeenAt) setNotificationsSeenAt(data.lastSeenAt);
      })
      .catch(() => {
        // Best-effort, same as the conversation read mark: a failed write just
        // means the bell lights again on the next load.
      });
  }, []);

  /** Ask the server to top up suggestions, then adopt whatever state it returns. */
  const generateSuggestions = useCallback(async () => {
    if (!SUPABASE_MODE || generating.current) return;
    generating.current = true;
    try {
      const res = await fetch('/api/match', { method: 'POST' });
      if (res.ok) applyState(await res.json());
    } catch (e) {
      console.error('Failed to refresh candidates:', e);
    } finally {
      generating.current = false;
    }
  }, [applyState]);

  const refreshCandidates = useCallback(async () => {
    if (SUPABASE_MODE) {
      await generateSuggestions();
      return;
    }

    if (!userProfile) return;

    const passedSet = new Set(passedProfileIds);
    const alreadyShown = new Set(matches.map(m => m.candidateProfile.id));
    const pool = SEED_PROFILES.filter(p => !passedSet.has(p.id) && !alreadyShown.has(p.id));

    setMatches(prev => [
      ...prev.filter(m => m.status !== 'suggested'),
      ...buildMatchesFromPool(userProfile, pool, passedSet),
    ]);
  }, [generateSuggestions, userProfile, passedProfileIds, matches]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        if (SUPABASE_MODE) {
          // Both start together, but they are consumed separately on purpose.
          //
          // The navbar only needs to know who you are, which is /api/profile.
          // Awaiting both before releasing anything meant the nav sat in its
          // skeleton for the slower of the two — and /api/matches is the slower
          // one, by a lot on a cold start.
          const profileRequest = fetch('/api/profile');
          const matchRequest = fetch('/api/matches');
          // Claimed below; the guard stops an early failure surfacing as an
          // unhandled rejection while we are still waiting on the profile.
          matchRequest.catch(() => {});

          let hasProfile = false;
          const res = await profileRequest;

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setAuthUser({
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.fullName ?? null,
                isAdmin: data.user.isAdmin === true,
              });
            }
            if (data.profile) {
              setUserProfile(data.profile);
              hasProfile = true;
            }
          }

          // The nav can settle now, without waiting for match state.
          setIsSessionLoaded(true);

          if (hasProfile) {
            const matchRes = await matchRequest;
            if (matchRes.ok) applyState(await matchRes.json());
          }
          return;
        }

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.userProfile) setUserProfile(parsed.userProfile);
          if (parsed.matches) setMatches(parsed.matches);
          if (parsed.conversations) setConversations(parsed.conversations);
          if (parsed.passedProfileIds) setPassedProfileIds(parsed.passedProfileIds);
        }
      } catch (e) {
        console.error('Failed to load Mindmate state:', e);
      } finally {
        setIsSessionLoaded(true);
        setIsLoaded(true);
      }
    };

    load();
  }, [applyState]);

  // Top up suggestions once the profile is known. Server-side caps at 3.
  useEffect(() => {
    if (!isLoaded || !SUPABASE_MODE || !userProfile) return;
    if (userProfile.visibility === 'paused') return;
    if (matches.some(m => m.status === 'suggested')) return;
    void generateSuggestions();
    // Intentionally not keyed on `matches` — this should fire on profile load, not
    // every time the match list changes, or passing a card would regenerate forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userProfile?.id, userProfile?.visibility]);

  /**
   * Live match state: a request arriving, someone accepting, someone unmatching.
   *
   * Lives in the provider rather than a page so Discover, Connections and the navbar
   * badges all stay current together. RLS scopes the stream — the matches SELECT
   * policy means only rows this user is part of are delivered.
   */
  useEffect(() => {
    const profileId = userProfile?.id;
    if (!SUPABASE_MODE || !profileId) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Accepting a request updates the match and inserts a conversation, which can
    // arrive as separate events — coalesce so that's one refetch, not several.
    const refetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const res = await fetch('/api/matches');
          if (res.ok) applyState(await res.json());
        } catch (e) {
          console.error('Failed to refresh match state:', e);
        }
      }, 150);
    };

    // postgres_changes filters can't express OR, and a match references this user
    // through either column, so both sides of the pair need their own listener.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      // Hand the socket the user's JWT before joining. postgres_changes evaluates
      // RLS at join time, and a channel joined without a user token reports
      // SUBSCRIBED and then silently receives nothing.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const token = data.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase.channel(uniqueChannelName(`mindmate:${profileId}`));

      for (const column of ['profile_a_id', 'profile_b_id']) {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `${column}=eq.${profileId}`,
          },
          refetch
        );
      }

      // Message inserts never touch `matches`, so without this the conversations
      // list keeps showing a stale count and snippet until a full reload.
      //
      // Intentionally unfiltered: a filter can only test one column, and there is no
      // way to express "any of my conversations" as the set changes. RLS does the
      // scoping instead — the messages policy only exposes rows in a connected
      // conversation this user belongs to, so nobody else's messages are delivered.
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        refetch
      );

      // Realtime never replays what was missed while disconnected, so resync on every
      // (re)connect. A backgrounded tab can have its socket dropped and silently lose
      // every update until the next reload.
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') refetch();
      });
    })();

    // Same reasoning for returning to the tab: the socket may have been throttled
    // or torn down while it was hidden.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userProfile?.id, applyState]);

  // Local demo mode persists everything; Supabase mode is server-authoritative.
  useEffect(() => {
    if (!isLoaded || SUPABASE_MODE) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ userProfile, matches, conversations, passedProfileIds })
      );
    } catch (e) {
      console.error('Failed to save Mindmate local storage:', e);
    }
  }, [userProfile, matches, conversations, passedProfileIds, isLoaded]);

  const saveProfile = async (
    displayName: string,
    age: number,
    cityOrTimezone: string,
    curiosityProfile: string,
    ianaTimezone?: string | null
  ) => {
    // Validated here rather than only in the form: /auth/complete auto-saves a
    // local draft without ever rendering the review screen, and a name that came
    // from Google is not otherwise checked by anything on the client.
    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.errors[0]);
    }

    const profileValidation = validateCuriosityProfile(curiosityProfile);
    if (!profileValidation.valid) {
      throw new Error(profileValidation.errors[0]);
    }

    if (SUPABASE_MODE) {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: nameValidation.normalizedText,
          age,
          cityOrTimezone,
          curiosityProfile: profileValidation.normalizedText,
          ianaTimezone,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save profile');
      }

      const { profile } = await res.json();
      setUserProfile(profile);
      await generateSuggestions();
      return;
    }

    const profile: Profile = {
      id: userProfile?.id || `user-profile-${Date.now()}`,
      userId: userProfile?.userId || `user-${Date.now()}`,
      displayName: nameValidation.normalizedText,
      age,
      cityOrTimezone,
      ianaTimezone: ianaTimezone ?? null,
      curiosityProfile: profileValidation.normalizedText,
      visibility: userProfile?.visibility || 'discoverable',
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUserProfile(profile);
    setMatches(buildMatchesFromPool(profile, SEED_PROFILES, new Set(passedProfileIds)));
  };

  /** POST a state-machine transition and adopt the server's view of the world. */
  const transition = async (
    matchId: string,
    action: 'connect' | 'pass' | 'unmatch'
  ): Promise<Match | null> => {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not update this connection.');
    }

    const data = await res.json();
    applyState(data);
    return data.match ?? null;
  };

  const connectMatch = async (matchId: string): Promise<Match | null> => {
    if (SUPABASE_MODE) return transition(matchId, 'connect');

    const target = matches.find(m => m.id === matchId);
    if (!target || !userProfile) return null;

    // Local demo mode has no second party, so it connects straight away.
    const connected: Match = {
      ...target,
      status: 'connected',
      requestedByProfileId: userProfile.id,
      conversationId: `convo-${target.id}`,
    };

    setMatches(prev => prev.map(m => (m.id === target.id ? connected : m)));

    setConversations(prev =>
      prev.some(c => c.matchId === target.id)
        ? prev
        : [
            {
              id: `convo-${target.id}`,
              matchId: target.id,
              candidateProfile: target.candidateProfile,
              sharedQuestion: target.sharedQuestion,
              resonanceSummary: target.explanation,
              messages: [],
              messageCount: 0,
              unreadCount: 0,
              createdAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
            },
            ...prev,
          ]
    );

    return connected;
  };

  const passMatch = async (matchId: string) => {
    if (SUPABASE_MODE) {
      await transition(matchId, 'pass');
      await generateSuggestions();
      return;
    }

    const target = matches.find(m => m.id === matchId);
    if (target) setPassedProfileIds(prev => [...prev, target.candidateProfile.id]);
    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  /**
   * Local demo mode only — Supabase-backed chat sends through
   * /api/conversations/[id]/messages so RLS stays the enforcement point.
   */
  const sendMessage = (conversationId: string, text: string) => {
    if (SUPABASE_MODE || !userProfile || !text.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderProfileId: userProfile.id,
      body: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const appendMessage = (message: Message) =>
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, message],
                messageCount: c.messageCount + 1,
                lastActivityAt: message.createdAt,
              }
            : c
        )
      );

    appendMessage(userMessage);

    const convo = conversations.find(c => c.id === conversationId);
    if (!convo) return;

    setTimeout(() => {
      appendMessage({
        id: `msg-reply-${Date.now()}`,
        conversationId,
        senderProfileId: convo.candidateProfile.id,
        body: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)],
        createdAt: new Date().toISOString(),
      });
    }, 1400);
  };

  const unmatchConversation = async (conversationId: string) => {
    const convo = conversations.find(c => c.id === conversationId);
    if (!convo) return;

    if (SUPABASE_MODE) {
      await transition(convo.matchId, 'unmatch');
      return;
    }

    setPassedProfileIds(prev => [...prev, convo.candidateProfile.id]);
    setMatches(prev => prev.filter(m => m.id !== convo.matchId));
    setConversations(prev => prev.filter(c => c.id !== conversationId));
  };

  const togglePauseDiscovery = async () => {
    if (!userProfile) return;
    const nextVis = userProfile.visibility === 'discoverable' ? 'paused' : 'discoverable';

    if (SUPABASE_MODE) {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: nextVis }),
      });
      if (res.ok) {
        const { profile } = await res.json();
        setUserProfile(profile);
      }
      return;
    }

    setUserProfile({ ...userProfile, visibility: nextVis });
  };

  const signOut = async () => {
    // Deliberately no React state clearing here.
    //
    // We are about to replace the document, so clearing React state achieves
    // nothing except a re-render of the page being left — which paints its
    // signed-out shape for a frame first ("No profile found" on /profile,
    // "Create your Curiosity Profile first" on /discover) before the navigation
    // commits. Leaving the tree untouched means the last thing on screen is the
    // page as it was, until it is replaced wholesale.
    //
    // The sign-out is awaited before navigating so the auth cookies are gone by
    // the time "/" is requested; otherwise middleware still sees a session and
    // bounces to /discover.
    if (SUPABASE_MODE) {
      await createClient().auth.signOut();
    }

    localStorage.removeItem(STORAGE_KEY);
    // Otherwise signing back in resurrects a draft from a previous session.
    clearOnboardingDraft();

    window.location.assign('/');
  };

  const resetAllData = async () => {
    if (SUPABASE_MODE) {
      const res = await fetch('/api/profile', { method: 'DELETE' });
      // Previously unchecked, so a 401 or 500 wiped the local state and navigated
      // away exactly as a success would, leaving the row still in the database.
      if (!res.ok) {
        throw new Error('Could not delete your data. Please try again.');
      }

      // The server route signs out too, but only server-side. Without this the
      // memoized browser client keeps its in-memory session and refresh timer, so
      // "/" still looks signed in to middleware and bounces to /discover — which
      // then renders the "create a profile" screen, since the profile is gone.
      await createClient().auth.signOut();
    }

    // Same reasoning as signOut: the caller replaces the document immediately
    // after this resolves, so nulling authUser/userProfile here only re-renders
    // the tree on its way out — which is what made the navbar flip to its
    // signed-out shape for a frame mid-delete.
    localStorage.removeItem(STORAGE_KEY);
    // "Delete all my data" has to mean the draft as well. Leaving it behind let
    // /auth/complete find it and re-save the profile that was just deleted.
    clearOnboardingDraft();
  };

  return (
    <MindmateContext.Provider
      value={{
        userProfile,
        authUser,
        isSupabaseMode: SUPABASE_MODE,
        setUserProfile,
        matches,
        conversations,
        passedProfileIds,
        isLoaded,
        isSessionLoaded,
        saveProfile,
        connectMatch,
        passMatch,
        sendMessage,
        unmatchConversation,
        markConversationRead,
        notificationsSeenAt,
        markNotificationsSeen,
        setActiveConversationId,
        togglePauseDiscovery,
        resetAllData,
        signOut,
        refreshCandidates,
      }}
    >
      {children}
    </MindmateContext.Provider>
  );
}

export function useMindmate() {
  const context = useContext(MindmateContext);
  if (!context) {
    throw new Error('useMindmate must be used within a MindmateProvider');
  }
  return context;
}
