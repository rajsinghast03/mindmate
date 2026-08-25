'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMindmate } from '@/context/mindmate-context';
import { MatchCard } from '@/components/match-card';
import { Avatar } from '@/components/avatar';
import { formatListTimestamp } from '@/lib/format/time';
import { MessageSquare, Compass, ArrowRight, Sparkles, Inbox, Search } from 'lucide-react';

/** Rows shown before the "show all" reveal, and the count that earns a filter box. */
const INITIAL_ROWS = 15;
const FILTER_THRESHOLD = 6;

export default function ConnectionsPage() {
  const { conversations, matches, userProfile, connectMatch, passMatch, isLoaded } = useMindmate();

  const [pendingAction, setPendingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter(c =>
      c.candidateProfile.displayName.toLowerCase().includes(needle)
    );
  }, [conversations, filter]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // Incoming first — those are the ones waiting on a decision from this user.
  const pending = matches
    .filter(m => m.status === 'requested')
    .sort((a, b) => (a.direction === 'incoming' ? -1 : 0) - (b.direction === 'incoming' ? -1 : 0));

  const incomingCount = pending.filter(m => m.direction === 'incoming').length;
  const rows = showAll || filter ? visible : visible.slice(0, INITIAL_ROWS);
  const hiddenCount = visible.length - rows.length;

  const runAction = async (fn: () => Promise<unknown>) => {
    setPendingAction(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update this connection.');
    } finally {
      setPendingAction(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
      <div className="mb-7">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-paper-200 px-3 py-1 text-xs font-semibold text-ink-700">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Mutual Connections</span>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink-950 sm:text-4xl">
          Your Conversations
        </h1>
        <p className="mt-2 text-sm text-ink-600 sm:text-base">
          Private, consent-first dialogues that began with a shared question.
        </p>
      </div>

      {actionError && (
        <div className="mb-6 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-xs font-medium text-accent-700">
          {actionError}
        </div>
      )}

      {/* Pending requests — a conversation opens only when both sides say yes */}
      {pending.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-accent-500" />
            <h2 className="font-serif text-xl font-medium text-ink-950">
              Pending {pending.length === 1 ? 'request' : 'requests'}
            </h2>
            {incomingCount > 0 && (
              <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {incomingCount} awaiting you
              </span>
            )}
          </div>

          <div className="space-y-6">
            {pending.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onConnect={id => runAction(() => connectMatch(id))}
                onPass={id => runAction(() => passMatch(id))}
                disabled={pendingAction}
              />
            ))}
          </div>
        </section>
      )}

      {conversations.length > 0 ? (
        <section>
          {conversations.length > FILTER_THRESHOLD && (
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations by name"
                className="w-full rounded-full border border-paper-300 bg-paper-50 py-2.5 pl-10 pr-4 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
              />
            </div>
          )}

          {/* divide-paper-300 rather than 200: against a paper-50 row the lighter
              tone is about an 11/255 step and reads as no divider at all, which made
              the list look like one block instead of separate conversations. */}
          <ul className="divide-y divide-paper-300 overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-soft">
            {rows.map(convo => {
              const last = convo.messages.at(-1);
              const isUnread = convo.unreadCount > 0;
              const fromMe = last?.senderProfileId === userProfile?.id;
              // Who said it matters more than the words in a list of "Hi"s.
              const prefix = last ? (fromMe ? 'You: ' : `${convo.candidateProfile.displayName}: `) : '';

              return (
                <li key={convo.id}>
                  <Link
                    href={`/chat/${convo.id}`}
                    className="flex items-center gap-3 px-3 py-3.5 transition-colors hover:bg-paper-100 active:bg-paper-200 sm:px-4"
                  >
                    <Avatar displayName={convo.candidateProfile.displayName} size="md" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`truncate font-serif text-[15px] leading-snug ${
                            isUnread ? 'font-semibold text-ink-950' : 'font-medium text-ink-900'
                          }`}
                        >
                          {convo.candidateProfile.displayName}
                        </span>
                        <time
                          dateTime={convo.lastActivityAt}
                          className={`shrink-0 text-[11px] ${
                            isUnread ? 'font-semibold text-accent-600' : 'text-ink-400'
                          }`}
                        >
                          {formatListTimestamp(convo.lastActivityAt)}
                        </time>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        {last ? (
                          <p
                            className={`min-w-0 flex-1 truncate text-[13px] ${
                              isUnread ? 'font-medium text-ink-800' : 'text-ink-600'
                            }`}
                          >
                            <span className="text-ink-500">{prefix}</span>
                            {last.body}
                          </p>
                        ) : (
                          <p className="min-w-0 flex-1 truncate font-serif text-[13px] italic text-ink-500">
                            {convo.sharedQuestion}
                          </p>
                        )}

                        {isUnread && (
                          <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                            {convo.unreadCount > 99 ? '99+' : convo.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}

            {rows.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-500">
                No conversations match &ldquo;{filter}&rdquo;.
              </li>
            )}
          </ul>

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 w-full rounded-full border border-paper-300 bg-paper-50 py-2.5 text-xs font-medium text-ink-600 transition-colors hover:bg-paper-200 hover:text-ink-950"
            >
              Show {hiddenCount} more {hiddenCount === 1 ? 'conversation' : 'conversations'}
            </button>
          )}
        </section>
      ) : (
        pending.length === 0 && (
          <div className="mx-auto max-w-lg rounded-3xl border border-paper-300 bg-paper-50 p-8 text-center shadow-soft sm:p-12">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-200 text-ink-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-serif text-2xl font-medium text-ink-950">
              No active conversations yet
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-ink-600">
              When you discover someone who shares your curiosities and you both choose to connect,
              your private conversation will open here.
            </p>

            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-6 py-3 text-sm font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800"
            >
              <Compass className="h-4 w-4" />
              <span>Discover Curated Minds</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )
      )}
    </div>
  );
}
