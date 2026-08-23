'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Match, Conversation, Message } from '@/types';
import { SEED_PROFILES } from '@/data/seed-profiles';
import { reRankCandidates } from '@/lib/matching/reranker';
import { generateLocalResonance } from '@/lib/matching/synthesizer';

interface MindmateContextType {
  userProfile: Profile | null;
  setUserProfile: (profile: Profile | null) => void;
  matches: Match[];
  conversations: Conversation[];
  passedProfileIds: string[];
  isLoaded: boolean;
  saveProfile: (displayName: string, age: number, cityOrTimezone: string, curiosityProfile: string) => void;
  connectProfile: (candidateId: string) => void;
  passProfile: (candidateId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  unmatchConversation: (conversationId: string) => void;
  togglePauseDiscovery: () => void;
  resetAllData: () => void;
  refreshCandidates: () => void;
}

const STORAGE_KEY = 'mindmate_state_v1';

const MindmateContext = createContext<MindmateContextType | undefined>(undefined);

export function MindmateProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [passedProfileIds, setPassedProfileIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.userProfile) setUserProfile(parsed.userProfile);
        if (parsed.matches) setMatches(parsed.matches);
        if (parsed.conversations) setConversations(parsed.conversations);
        if (parsed.passedProfileIds) setPassedProfileIds(parsed.passedProfileIds);
      }
    } catch (e) {
      console.error('Failed to load Mindmate local storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const state = {
        userProfile,
        matches,
        conversations,
        passedProfileIds,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save Mindmate local storage:', e);
    }
  }, [userProfile, matches, conversations, passedProfileIds, isLoaded]);

  // Compute matches whenever userProfile changes or candidate pool updates
  const refreshCandidates = () => {
    if (!userProfile) return;

    const passedSet = new Set(passedProfileIds);
    const connectedOrRequestedIds = new Set(matches.map(m => m.candidateProfile.id));

    // Filter candidate profiles
    const pool = SEED_PROFILES.filter(
      p => !passedSet.has(p.id) && !connectedOrRequestedIds.has(p.id)
    );

    const scored = reRankCandidates(userProfile, pool, passedSet);
    const topCandidates = scored.slice(0, 3);

    const newMatches: Match[] = topCandidates.map(sc => {
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
        status: 'suggested',
        requestedByProfileId: null,
        createdAt: new Date().toISOString(),
      };
    });

    setMatches(prev => {
      // Keep existing non-suggested matches (e.g. requested or connected)
      const existingActive = prev.filter(m => m.status !== 'suggested');
      return [...existingActive, ...newMatches];
    });
  };

  const saveProfile = (
    displayName: string,
    age: number,
    cityOrTimezone: string,
    curiosityProfile: string
  ) => {
    const profile: Profile = {
      id: userProfile?.id || `user-profile-${Date.now()}`,
      userId: userProfile?.userId || `user-${Date.now()}`,
      displayName,
      age,
      cityOrTimezone,
      curiosityProfile,
      visibility: userProfile?.visibility || 'discoverable',
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUserProfile(profile);

    // Automatically compute initial match pool
    const passedSet = new Set(passedProfileIds);
    const scored = reRankCandidates(profile, SEED_PROFILES, passedSet);
    const topCandidates = scored.slice(0, 3);

    const initialMatches: Match[] = topCandidates.map(sc => {
      const resonance = generateLocalResonance(profile, sc.candidate);
      return {
        id: `match-${sc.candidate.id}`,
        profileAId: profile.id,
        profileBId: sc.candidate.id,
        candidateProfile: sc.candidate,
        score: sc.score,
        explanation: resonance.explanation,
        sharedCuriosity: resonance.sharedCuriosity,
        sharedQuestion: resonance.sharedQuestion,
        status: 'suggested',
        requestedByProfileId: null,
        createdAt: new Date().toISOString(),
      };
    });

    setMatches(initialMatches);
  };

  const connectProfile = (candidateId: string) => {
    const targetMatch = matches.find(m => m.candidateProfile.id === candidateId);
    if (!targetMatch || !userProfile) return;

    // Simulate mutual acceptance
    const updatedMatch: Match = {
      ...targetMatch,
      status: 'connected',
      requestedByProfileId: userProfile.id,
    };

    // Update matches
    setMatches(prev => prev.map(m => m.id === targetMatch.id ? updatedMatch : m));

    // Create a new conversation if not already created
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

    // Simulate a thoughtful response from candidate after 1.5s
    const convo = conversations.find(c => c.id === conversationId);
    if (convo) {
      setTimeout(() => {
        const replies = [
          `That really resonates with me. I was just thinking about how rare it is to find someone who notices that exact subtlety.`,
          `I love how you phrased that. In my experience, once you start looking at it through that lens, you can't unsee it.`,
          `That makes so much sense! It reminds me of why I wanted to start this project in the first place. Tell me more about what got you interested in this.`,
          `Such a great perspective. What’s the next thing you’re hoping to experiment with around that?`
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

  const togglePauseDiscovery = () => {
    if (!userProfile) return;
    const nextVis = userProfile.visibility === 'discoverable' ? 'paused' : 'discoverable';
    setUserProfile({
      ...userProfile,
      visibility: nextVis,
    });
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserProfile(null);
    setMatches([]);
    setConversations([]);
    setPassedProfileIds([]);
  };

  return (
    <MindmateContext.Provider
      value={{
        userProfile,
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
