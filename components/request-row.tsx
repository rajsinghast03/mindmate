'use client';

import React from 'react';
import { Match } from '@/types';
import { Avatar } from '@/components/avatar';
import { Check, Clock, X } from 'lucide-react';

interface RequestRowProps {
  match: Match;
  onConnect: (matchId: string) => void;
  onPass: (matchId: string) => void;
  disabled?: boolean;
}

/**
 * A pending request at list density.
 *
 * `MatchCard` is the deciding surface on Discover and runs 400–600px tall, which
 * is right when a card is the whole screen and wrong when several are stacked in
 * a tab. This keeps what a decision actually needs — who, and the one line saying
 * why — and sends the rest to the card on Discover.
 */
export function RequestRow({ match, onConnect, onPass, disabled = false }: RequestRowProps) {
  const { candidateProfile, sharedCuriosity, explanation, direction } = match;
  const isIncoming = direction === 'incoming';

  return (
    <li className="flex flex-wrap items-start gap-3 px-3 py-4 sm:flex-nowrap sm:px-4">
      <Avatar displayName={candidateProfile.displayName} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-serif text-[15px] font-medium leading-snug text-ink-900">
            {candidateProfile.displayName}
          </span>
          <span className="shrink-0 text-xs text-ink-500">{candidateProfile.age}</span>
          {candidateProfile.isDemo && (
            <span className="shrink-0 rounded-full bg-paper-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
              Demo
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-[13px] text-ink-600">
          <span className="text-accent-700">{sharedCuriosity}</span>
          <span className="text-ink-400"> · </span>
          {explanation}
        </p>

        {!isIncoming && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-500">
            <Clock className="h-3 w-3 shrink-0 text-ink-400" />
            <span>Request sent — waiting for them to accept</span>
          </p>
        )}
      </div>

      {/* Full width below `sm` so two buttons never squeeze the name to nothing. */}
      <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto">
        {isIncoming ? (
          <>
            <button
              onClick={() => onPass(match.id)}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-ink-600 transition-all hover:bg-paper-200/80 hover:text-ink-950 active:scale-95 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5 text-ink-400" />
              <span>Not for me</span>
            </button>
            <button
              onClick={() => onConnect(match.id)}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-accent-600 hover:shadow-soft active:scale-95 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Connect</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onPass(match.id)}
            disabled={disabled}
            className="rounded-full px-3 py-2 text-xs font-medium text-ink-500 transition-all hover:bg-paper-200/80 hover:text-ink-950 disabled:opacity-50"
          >
            Withdraw
          </button>
        )}
      </div>
    </li>
  );
}
