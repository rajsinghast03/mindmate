'use client';

import React from 'react';
import { Match } from '@/types';
import { Sparkles, HelpCircle, MapPin, Check, X } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  onConnect: (candidateId: string) => void;
  onPass: (candidateId: string) => void;
  isConnected?: boolean;
}

export function MatchCard({ match, onConnect, onPass, isConnected = false }: MatchCardProps) {
  const { candidateProfile, explanation, sharedCuriosity, sharedQuestion } = match;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card transition-all hover:shadow-lifted">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 border-b border-paper-200 pb-5">
        <div className="flex items-center gap-3.5">
          {/* Calm Avatar Circle */}
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-paper-200 text-ink-950 font-serif text-xl sm:text-2xl font-semibold border border-paper-300/80 shadow-sm">
            {candidateProfile.displayName.charAt(0)}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-ink-950">
                {candidateProfile.displayName}
              </h3>
              <span className="text-sm font-sans text-ink-500 font-normal">
                {candidateProfile.age}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-ink-500 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-ink-400" />
              <span>{candidateProfile.cityOrTimezone}</span>
            </div>
          </div>
        </div>

        {/* Shared Theme Pill */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100/90 px-3 py-1 text-xs font-semibold text-accent-700">
          <Sparkles className="h-3 w-3 text-accent-500" />
          <span>{sharedCuriosity}</span>
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
            <span>Connected — Private conversation open</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => onPass(candidateProfile.id)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-medium text-ink-600 hover:bg-paper-200/80 hover:text-ink-950 transition-all active:scale-95"
            >
              <X className="h-4 w-4 text-ink-400" />
              <span>Not for me</span>
            </button>

            <button
              onClick={() => onConnect(candidateProfile.id)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-600 hover:shadow-soft active:scale-95"
            >
              <Check className="h-4 w-4" />
              <span>I&apos;d like to connect</span>
            </button>
          </>
        )}
      </div>
    </article>
  );
}
