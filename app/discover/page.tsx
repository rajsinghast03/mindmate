'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMindmate } from '@/context/mindmate-context';
import { MatchCard } from '@/components/match-card';
import { Sparkles, MessageSquare, RefreshCw, Compass, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function DiscoverPage() {
  const {
    userProfile,
    matches,
    connectProfile,
    passProfile,
    refreshCandidates,
    isLoaded,
  } = useMindmate();

  const [connectedToast, setConnectedToast] = useState<{
    displayName: string;
    question: string;
  } | null>(null);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          <p className="font-serif text-sm text-ink-600">Finding resonant minds...</p>
        </div>
      </div>
    );
  }

  // If no profile exists, guide to onboarding
  if (!userProfile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-paper-200 text-ink-950 font-serif text-2xl font-bold mb-6">
          M
        </div>
        <h1 className="font-serif text-3xl font-medium text-ink-950 mb-3">
          Create your Curiosity Profile first
        </h1>
        <p className="text-ink-600 text-sm mb-8 max-w-md mx-auto">
          Mindmate needs to understand what ideas and crafts occupy your mind before introducing you to resonant peers.
        </p>
        <Link
          href="/onboarding/paste"
          className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-8 py-3.5 text-sm font-medium text-paper-50 shadow-soft hover:bg-ink-800 transition-all"
        >
          <span>Paste your Curiosity Profile</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Active suggested matches
  const activeSuggested = matches.filter(m => m.status === 'suggested');

  const handleConnect = (candidateId: string) => {
    const target = matches.find(m => m.candidateProfile.id === candidateId);
    connectProfile(candidateId);

    if (target) {
      setConnectedToast({
        displayName: target.candidateProfile.displayName,
        question: target.sharedQuestion,
      });

      // Auto dismiss toast after 6s
      setTimeout(() => setConnectedToast(null), 6000);
    }
  };

  const handlePass = (candidateId: string) => {
    passProfile(candidateId);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-accent-500" />
          <span>Curated Resonance Pool</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink-950">
          Minds tuned to your frequencies
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600 max-w-md mx-auto">
          We introduce you to a small number of unusually relevant people and explain why each connection exists.
        </p>
      </div>

      {/* Connected Toast Notification */}
      {connectedToast && (
        <div className="mb-8 rounded-2xl bg-sage-50 border border-sage-200 p-5 shadow-soft animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-sage-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-serif text-base font-medium text-ink-950">
                  You connected with {connectedToast.displayName}!
                </h4>
                <p className="text-xs text-ink-600 mt-0.5">
                  A private conversation is open with your shared starter question.
                </p>
                <div className="mt-3">
                  <Link
                    href="/connections"
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sage-600 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Open Conversation</span>
                  </Link>
                </div>
              </div>
            </div>
            <button
              onClick={() => setConnectedToast(null)}
              className="text-xs text-ink-400 hover:text-ink-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Discovery Cards Deck */}
      {activeSuggested.length > 0 ? (
        <div className="space-y-8">
          {activeSuggested.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              onConnect={handleConnect}
              onPass={handlePass}
            />
          ))}
        </div>
      ) : (
        /* Calm Empty State */
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-8 sm:p-12 text-center shadow-soft max-w-lg mx-auto">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-paper-200 text-ink-600 mb-5">
            <Compass className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-2xl font-medium text-ink-950 mb-2">
            You&apos;re caught up for now
          </h3>
          <p className="text-sm text-ink-600 leading-relaxed mb-6">
            Mindmate prioritizes depth over volume. We don&apos;t flood your feed with weak introductions. Check your active conversations or discover again later.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/connections"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-3 text-sm font-medium text-paper-50 hover:bg-ink-800 transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Go to Conversations</span>
            </Link>

            <button
              onClick={refreshCandidates}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full border border-paper-300 bg-paper-100 px-5 py-3 text-sm font-medium text-ink-700 hover:bg-paper-200 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Pool</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
