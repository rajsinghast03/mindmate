'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import { MatchCard } from '@/components/match-card';
import { LogoMark } from '@/components/logo';
import { Sparkles, MessageSquare, RefreshCw, Compass, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function DiscoverPage() {
  const router = useRouter();
  const {
    userProfile,
    matches,
    connectMatch,
    passMatch,
    refreshCandidates,
    isLoaded,
    authUser,
    isSupabaseMode,
  } = useMindmate();

  const [toast, setToast] = useState<{
    kind: 'connected' | 'requested';
    displayName: string;
    conversationId?: string | null;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Resume onboarding if magic link landed on discover with a saved draft
  useEffect(() => {
    if (!isLoaded || userProfile) return;
    if (isSupabaseMode && authUser) {
      router.replace('/auth/complete');
    }
  }, [isLoaded, userProfile, isSupabaseMode, authUser, router]);

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
        <LogoMark size="lg" className="mx-auto mb-6" />
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

  const handleConnect = async (matchId: string) => {
    const target = matches.find(m => m.id === matchId);
    setPendingAction(true);
    setActionError(null);

    try {
      const updated = await connectMatch(matchId);
      const displayName =
        updated?.candidateProfile.displayName ?? target?.candidateProfile.displayName ?? 'them';

      // Connecting to a real person opens a request; only a mutual yes opens the chat.
      setToast(
        updated?.status === 'connected'
          ? { kind: 'connected', displayName, conversationId: updated.conversationId }
          : { kind: 'requested', displayName }
      );
      setTimeout(() => setToast(null), 8000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not send that request.');
    } finally {
      setPendingAction(false);
    }
  };

  const handlePass = async (matchId: string) => {
    setPendingAction(true);
    setActionError(null);
    try {
      await passMatch(matchId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update that card.');
    } finally {
      setPendingAction(false);
    }
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

      {actionError && (
        <div className="mb-6 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-xs font-medium text-accent-700">
          {actionError}
        </div>
      )}

      {/* Outcome notice — a request is not yet a conversation */}
      {toast && (
        <div
          className={`mb-8 rounded-2xl border p-5 shadow-soft animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.kind === 'connected'
              ? 'bg-sage-50 border-sage-200'
              : 'bg-paper-50 border-paper-300'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {toast.kind === 'connected' ? (
                <CheckCircle2 className="h-5 w-5 text-sage-600 mt-0.5 shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-ink-500 mt-0.5 shrink-0" />
              )}
              <div>
                <h4 className="font-serif text-base font-medium text-ink-950">
                  {toast.kind === 'connected'
                    ? `You connected with ${toast.displayName}!`
                    : `Request sent to ${toast.displayName}`}
                </h4>
                <p className="text-xs text-ink-600 mt-0.5">
                  {toast.kind === 'connected'
                    ? 'A private conversation is open with your shared starter question.'
                    : 'They decide next. The conversation opens only once they accept too.'}
                </p>
                {toast.kind === 'connected' && (
                  <div className="mt-3">
                    <Link
                      href={toast.conversationId ? `/chat/${toast.conversationId}` : '/connections'}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sage-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sage-600 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Open Conversation</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
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
              disabled={pendingAction}
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
              onClick={() => void refreshCandidates()}
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
