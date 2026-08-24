'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, Match, Conversation, Message } from '@/types';
import { SEED_PROFILES } from '@/data/seed-profiles';
import { reRankCandidates } from '@/lib/matching/reranker';
import { generateLocalResonance } from '@/lib/matching/synthesizer';
import { createClient } from '@/lib/supabase/client';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';

const SUPABASE_MODE =
  typeof window !== 'undefined'
    ? Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      )
    : false;

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
  connectProfile: (candidateId: string) => void;
  passProfile: (candidateId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  unmatchConversation: (conversationId: string) => void;
  togglePauseDiscovery: () => Promise<void>;
  resetAllData: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshCandidates: () => void;
}

const STORAGE_KEY = 'mindmate_state_v1';

const MindmateContext = createContext<MindmateContextType | undefined>(undefined);

function buildMatchesFromPool(userProfile: Profile, pool: Profile[], passedSet: Set<string>): Match[] {
  const scored = reRankCandidates(userProfile, pool, passedSet);
  return scored.slice(0, 3).map(sc => {
    const resonance = generateLocalResonance(userProfile, sc.candidate);
    return {
      id: `match-${sc.candidate.id}`,
      profileAId: userProfile.id,
      profileBId: sc.candidate.id,
      candidateProfile: sc.candidate,
      score: sc.score,
      explanation: resonance.explanation,
      sharedCuriosity: resonance.sharedCuriosity,
      sharedQuestion: resonance.sharedQuestion,
      status: 'suggested' as const,
      requestedByProfileId: null,
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

  const refreshCandidates = useCallback(() => {
    if (!userProfile) return;

    const passedSet = new Set(passedProfileIds);
    const connectedOrRequestedIds = new Set(matches.map(m => m.candidateProfile.id));
    const pool = SEED_PROFILES.filter(
      p => !passedSet.has(p.id) && !connectedOrRequestedIds.has(p.id)
    );

    const newMatches = buildMatchesFromPool(userProfile, pool, passedSet);

    setMatches(prev => {
      const existingActive = prev.filter(m => m.status !== 'suggested');
      return [...existingActive, ...newMatches];
    });
  }, [userProfile, passedProfileIds, matches]);

  // Load state: Supabase profile + local match/chat state
  useEffect(() => {
    const load = async () => {
      try {
        if (SUPABASE_MODE) {
          const res = await fetch('/api/profile');
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setAuthUser({ id: data.user.id, email: data.user.email });
            }
            if (data.profile) {
              setUserProfile(data.profile);
              const passedSet = new Set<string>();
              const initialMatches = buildMatchesFromPool(data.profile, SEED_PROFILES, passedSet);
              setMatches(initialMatches);
            }
          }
        }

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!SUPABASE_MODE && parsed.userProfile) setUserProfile(parsed.userProfile);
          if (parsed.matches) setMatches(prev => (prev.length ? prev : parsed.matches));
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
  }, []);

  // Persist match/chat state locally (Phase 4 moves this to Supabase)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          userProfile: SUPABASE_MODE ? null : userProfile,
          matches,
          conversations,
          passedProfileIds,
        })
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
        body: JSON.stringify({ displayName, age, cityOrTimezone, curiosityProfile: profileValidation.normalizedText, ianaTimezone }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save profile');
      }

      const { profile } = await res.json();
      setUserProfile(profile);
      setMatches(buildMatchesFromPool(profile, SEED_PROFILES, new Set(passedProfileIds)));
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

  const connectProfile = (candidateId: string) => {
    const targetMatch = matches.find(m => m.candidateProfile.id === candidateId);
    if (!targetMatch || !userProfile) return;

    const updatedMatch: Match = {
      ...targetMatch,
      status: 'connected',
      requestedByProfileId: userProfile.id,
    };

    setMatches(prev => prev.map(m => (m.id === targetMatch.id ? updatedMatch : m)));

    const existingConvo = conversations.find(c => c.matchId === targetMatch.id);
    if (!existingConvo) {
      const newConversation: Conversation = {
        id: `convo-${targetMatch.id}`,
        matchId: targetMatch.id,
        candidateProfile: targetMatch.candidateProfile,
        sharedQuestion: targetMatch.sharedQuestion,
        resonanceSummary: targetMatch.explanation,
        messages: [],
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      setConversations(prev => [newConversation, ...prev]);
    }
  };

  const passProfile = (candidateId: string) => {
    setPassedProfileIds(prev => [...prev, candidateId]);
    setMatches(prev => prev.filter(m => m.candidateProfile.id !== candidateId));
  };

  const sendMessage = (conversationId: string, text: string) => {
    if (!userProfile || !text.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderProfileId: userProfile.id,
      body: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: [...c.messages, userMessage],
          lastActivityAt: new Date().toISOString(),
        };
      })
    );

    const convo = conversations.find(c => c.id === conversationId);
    if (convo) {
      setTimeout(() => {
        const replies = [
          `That really resonates with me. I was just thinking about how rare it is to find someone who notices that exact subtlety.`,
          `I love how you phrased that. In my experience, once you start looking at it through that lens, you can't unsee it.`,
          `That makes so much sense! It reminds me of why I wanted to start this project in the first place. Tell me more about what got you interested in this.`,
          `Such a great perspective. What's the next thing you're hoping to experiment with around that?`,
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        const replyMessage: Message = {
          id: `msg-reply-${Date.now()}`,
          conversationId,
          senderProfileId: convo.candidateProfile.id,
          body: randomReply,
          createdAt: new Date().toISOString(),
        };

        setConversations(latest =>
          latest.map(c => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: [...c.messages, replyMessage],
              lastActivityAt: new Date().toISOString(),
            };
          })
        );
      }, 1400);
    }
  };

  const unmatchConversation = (conversationId: string) => {
    const convo = conversations.find(c => c.id === conversationId);
    if (convo) {
      setPassedProfileIds(prev => [...prev, convo.candidateProfile.id]);
      setMatches(prev => prev.filter(m => m.id !== convo.matchId));
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    }
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
    if (SUPABASE_MODE) {
      const supabase = createClient();
      await supabase.auth.signOut();
      setAuthUser(null);
    }
    setUserProfile(null);
    setMatches([]);
    setConversations([]);
    setPassedProfileIds([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const resetAllData = async () => {
    if (SUPABASE_MODE) {
      await fetch('/api/profile', { method: 'DELETE' });
      setAuthUser(null);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUserProfile(null);
    setMatches([]);
    setConversations([]);
    setPassedProfileIds([]);
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
        connectProfile,
        passProfile,
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
