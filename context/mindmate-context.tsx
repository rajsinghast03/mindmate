'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Profile, Match, Conversation, Message } from '@/types';
import { SEED_PROFILES } from '@/data/seed-profiles';
import { reRankCandidates } from '@/lib/matching/reranker';
import { generateLocalResonance } from '@/lib/matching/synthesizer';
import { DEMO_REPLIES } from '@/lib/matching/demo-replies';
import { createClient, uniqueChannelName } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';

/**
 * Same check the server uses, so unfilled .env placeholders can't switch the client
 * into Supabase mode. NEXT_PUBLIC_* values are inlined at build time, so this
 * resolves identically during SSR and hydration.
 */
const SUPABASE_MODE = isSupabaseConfigured();

export type AuthUser = {
  id: string;
  email: string;
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
    };
  });
}

export function MindmateProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [passedProfileIds, setPassedProfileIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Guards the top-up call so a re-render storm can't fire several generations.
  const generating = useRef(false);

  const applyState = useCallback(
    (payload: { matches?: Match[]; conversations?: Conversation[] }) => {
      if (payload.matches) setMatches(payload.matches);
      if (payload.conversations) setConversations(payload.conversations);
    },
    []
  );

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
          const res = await fetch('/api/profile');
          if (res.ok) {
            const data = await res.json();
            if (data.user) setAuthUser({ id: data.user.id, email: data.user.email });
            if (data.profile) {
              setUserProfile(data.profile);

              const matchRes = await fetch('/api/matches');
              if (matchRes.ok) applyState(await matchRes.json());
            }
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

      channel = supabase.channel(uniqueChannelName(`matches:${profileId}`));
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
    const profileValidation = validateCuriosityProfile(curiosityProfile);
    if (!profileValidation.valid) {
      throw new Error(profileValidation.errors[0]);
    }

    if (SUPABASE_MODE) {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
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
      displayName,
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

  const clearLocalState = () => {
    setUserProfile(null);
    setMatches([]);
    setConversations([]);
    setPassedProfileIds([]);
  };

  const signOut = async () => {
    if (SUPABASE_MODE) {
      await createClient().auth.signOut();
      setAuthUser(null);
    }
    clearLocalState();
    localStorage.removeItem(STORAGE_KEY);
  };

  const resetAllData = async () => {
    if (SUPABASE_MODE) {
      await fetch('/api/profile', { method: 'DELETE' });
      setAuthUser(null);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    clearLocalState();
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
        saveProfile,
        connectMatch,
        passMatch,
        sendMessage,
        unmatchConversation,
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
