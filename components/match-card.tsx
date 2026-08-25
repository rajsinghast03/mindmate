'use client';

import React from 'react';
import { Match } from '@/types';
import { Avatar } from '@/components/avatar';
import { Sparkles, HelpCircle, MapPin, Check, X, Clock, Inbox } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  onConnect: (matchId: string) => void;
  onPass: (matchId: string) => void;
  disabled?: boolean;
}

export function MatchCard({ match, onConnect, onPass, disabled = false }: MatchCardProps) {
  const { candidateProfile, explanation, sharedCuriosity, sharedQuestion, status, direction } =
    match;

  const isIncomingRequest = status === 'requested' && direction === 'incoming';
  const isAwaitingThem = status === 'requested' && direction === 'outgoing';
  const isConnected = status === 'connected';

  return (
    <article className="relative overflow-hidden rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card transition-all hover:shadow-lifted">
      {isIncomingRequest && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-accent-50 border border-accent-200 px-4 py-2.5 text-xs font-semibold text-accent-700">
          <Inbox className="h-4 w-4 text-accent-500 shrink-0" />
          <span>{candidateProfile.displayName} would like to connect with you</span>
        </div>
      )}

      {/* Header Info */}
      {/* Wraps below `sm`: at 390px the pill and the identity block were fighting
          over the same row, forcing the location onto four lines and the age below
          the name. On its own line the pill costs one row and nothing is squeezed. */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-paper-200 pb-5 sm:flex-nowrap sm:gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          {/* Calm Avatar Circle */}
          <Avatar displayName={candidateProfile.displayName} size="lg" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-ink-950">
                {candidateProfile.displayName}
              </h3>
              <span className="text-sm font-sans text-ink-500 font-normal">
                {candidateProfile.age}
              </span>
              {candidateProfile.isDemo && (
                <span className="rounded-full bg-paper-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
                  Demo profile
                </span>
              )}
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-ink-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-400" />
              <span className="truncate">{candidateProfile.cityOrTimezone}</span>
            </div>
          </div>
        </div>

        {/* Shared Theme Pill — width-capped so an over-long theme can't break the header */}
        <span className="inline-flex shrink items-start gap-1.5 rounded-full bg-accent-100/90 px-3 py-1 text-xs font-semibold text-accent-700 sm:max-w-[45%]">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent-500" />
          <span className="line-clamp-2">{sharedCuriosity}</span>
        </span>
      </div>

      {/* Resonance Section (The "Why" Behind The Introduction) */}
      <div className="my-6 space-y-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-500 mb-1.5 font-semibold">
            Why your minds connect
          </div>
          <p className="font-serif text-lg leading-relaxed text-ink-900 bg-paper-100/80 p-4 rounded-2xl border border-paper-200/80 italic">
            &ldquo;{explanation}&rdquo;
          </p>
        </div>

        {/* Curated First Question */}
        <div className="rounded-2xl border border-dashed border-paper-300/80 bg-paper-100/40 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-600 mb-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-accent-500" />
            <span>Suggested First Question</span>
          </div>
          <p className="font-serif text-base text-ink-950 font-medium leading-normal">
            &ldquo;{sharedQuestion}&rdquo;
          </p>
        </div>

        {/* Curiosity Topics */}
        {candidateProfile.curiosityTags && candidateProfile.curiosityTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {candidateProfile.curiosityTags.map((tag, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-paper-200/90 px-2.5 py-1 text-xs text-ink-700 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-paper-200 pt-5 flex items-center justify-between gap-3">
        {isConnected ? (
          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-sage-100 text-sage-700 font-medium text-sm">
            <Check className="h-4 w-4" />
            <span>Connected — private conversation open</span>
          </div>
        ) : isAwaitingThem ? (
          <>
            <div className="flex-1 flex items-center gap-2 py-3 text-sm text-ink-600">
              <Clock className="h-4 w-4 text-ink-400 shrink-0" />
              <span>Request sent — waiting for them to accept</span>
            </div>
            <button
              onClick={() => onPass(match.id)}
              disabled={disabled}
              className="rounded-full px-4 py-2.5 text-xs font-medium text-ink-500 hover:bg-paper-200/80 hover:text-ink-950 transition-all disabled:opacity-50"
            >
              Withdraw
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onPass(match.id)}
              disabled={disabled}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-medium text-ink-600 hover:bg-paper-200/80 hover:text-ink-950 transition-all active:scale-95 disabled:opacity-50"
            >
              <X className="h-4 w-4 text-ink-400" />
              <span>Not for me</span>
            </button>

            <button
              onClick={() => onConnect(match.id)}
              disabled={disabled}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-600 hover:shadow-soft active:scale-95 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>I&rsquo;d like to connect</span>
            </button>
          </>
        )}
      </div>
    </article>
  );
}
