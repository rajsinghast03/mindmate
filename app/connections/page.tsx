'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import { RequestRow } from '@/components/request-row';
import { Avatar } from '@/components/avatar';
import { formatListTimestamp } from '@/lib/format/time';
import { MessageSquare, Compass, ArrowRight, Sparkles, Inbox, Search } from 'lucide-react';

/** Rows shown before the "show all" reveal, and the count that earns a filter box. */
const INITIAL_ROWS = 15;
const FILTER_THRESHOLD = 6;

type Tab = 'chats' | 'requests';

/** The page's own loading state, reused as the Suspense fallback below. */
function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
    </div>
  );
}

/**
 * Wrapped because `useSearchParams` opts the tree into client-side rendering, and
 * Next refuses to prerender the route without a boundary to fall back to.
 */
export default function ConnectionsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ConnectionsList />
    </Suspense>
  );
}

function ConnectionsList() {
  const { conversations, matches, userProfile, connectMatch, passMatch, isLoaded } = useMindmate();
  const searchParams = useSearchParams();

  const [pendingAction, setPendingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  // Seeded from the URL so the notification bell can land someone on the request
  // they were told about, then owned locally — switching tabs is not navigation.
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'requests' ? 'requests' : 'chats');

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter(c =>
      c.candidateProfile.displayName.toLowerCase().includes(needle)
    );
  }, [conversations, filter]);

  if (!isLoaded) return <Spinner />;

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

      {/* Requests used to stack above the list as full match cards, which pushed
          every real conversation off the first screen. They keep their own tab
          now; chats are what this page opens on. */}
      <div role="tablist" aria-label="Conversations and requests" className="mb-5 flex items-center gap-2">
        <button
          role="tab"
          id="tab-chats"
          aria-selected={tab === 'chats'}
          aria-controls="panel-chats"
          onClick={() => setTab('chats')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'chats'
              ? 'bg-ink-950 text-paper-50'
              : 'text-ink-600 hover:bg-paper-200/70 hover:text-ink-950'
          }`}
        >
          Chats
        </button>

        <button
          role="tab"
          id="tab-requests"
          aria-selected={tab === 'requests'}
          aria-controls="panel-requests"
          onClick={() => setTab('requests')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'requests'
              ? 'bg-ink-950 text-paper-50'
              : 'text-ink-600 hover:bg-paper-200/70 hover:text-ink-950'
          }`}
        >
          <span>Requests</span>
          {pending.length > 0 && (
            <span
              className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                incomingCount > 0 ? 'bg-accent-700 text-white' : 'bg-paper-300 text-ink-700'
              }`}
            >
              {pending.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'requests' ? (
        <section role="tabpanel" id="panel-requests" aria-labelledby="tab-requests">
          {pending.length > 0 ? (
            <ul className="divide-y divide-paper-300 overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-soft">
              {pending.map(match => (
                <RequestRow
                  key={match.id}
                  match={match}
                  onConnect={id => runAction(() => connectMatch(id))}
                  onPass={id => runAction(() => passMatch(id))}
                  disabled={pendingAction}
                />
              ))}
            </ul>
          ) : (
            <div className="mx-auto max-w-lg rounded-3xl border border-paper-300 bg-paper-50 p-8 text-center shadow-soft sm:p-12">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-200 text-ink-600">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-serif text-2xl font-medium text-ink-950">
                No pending requests
              </h3>
              <p className="text-sm leading-relaxed text-ink-600">
                When someone asks to connect, or you ask them, it waits here until you both agree.
              </p>
            </div>
          )}
        </section>
      ) : conversations.length > 0 ? (
        <section role="tabpanel" id="panel-chats" aria-labelledby="tab-chats">
          {conversations.length > FILTER_THRESHOLD && (
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations by name"
                className="w-full rounded-full border border-paper-300 bg-paper-50 py-2.5 pl-10 pr-4 text-sm text-ink-950 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
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
                            isUnread ? 'font-semibold text-accent-700' : 'text-ink-400'
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
                          <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent-700 px-1 text-[10px] font-bold text-white">
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
        <section
          role="tabpanel"
          id="panel-chats"
          aria-labelledby="tab-chats"
          className="mx-auto max-w-lg rounded-3xl border border-paper-300 bg-paper-50 p-8 text-center shadow-soft sm:p-12"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-200 text-ink-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="mb-2 font-serif text-2xl font-medium text-ink-950">
            No active conversations yet
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-ink-600">
            {pending.length > 0
              ? 'A conversation opens as soon as a pending request is accepted on both sides.'
              : 'When you discover someone who shares your curiosities and you both choose to connect, your private conversation will open here.'}
          </p>

          <Link
            href={pending.length > 0 ? '#' : '/discover'}
            onClick={
              pending.length > 0
                ? e => {
                    e.preventDefault();
                    setTab('requests');
                  }
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-6 py-3 text-sm font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800"
          >
            {pending.length > 0 ? (
              <>
                <Inbox className="h-4 w-4" />
                <span>
                  See {pending.length} pending {pending.length === 1 ? 'request' : 'requests'}
                </span>
              </>
            ) : (
              <>
                <Compass className="h-4 w-4" />
                <span>Discover Curated Minds</span>
              </>
            )}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
}
