'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Inbox, Sparkles } from 'lucide-react';
import { useMindmate } from '@/context/mindmate-context';
import { Avatar } from '@/components/avatar';
import { formatListTimestamp } from '@/lib/format/time';

/**
 * The two connection events that need the user to move, in one panel.
 *
 * Both are derived from `matches` rather than stored: an accepted invite is a
 * connected match this user requested, and an incoming request is a requested
 * match they did not. Nothing is written when an event happens — only when the
 * user looks at it, which is the single `notificationsSeenAt` high-water mark.
 *
 * Live updates come free: the provider already holds an app-wide realtime
 * subscription on the matches table, so anything derived from `matches`
 * re-renders when the counterpart acts.
 */

/** Long lists get a scrollbar, but the panel is not an archive. */
const MAX_ROWS = 8;

type Item = {
  matchId: string;
  kind: 'accepted' | 'incoming';
  displayName: string;
  href: string;
  updatedAt: string;
};

const newest = (items: Item[]) =>
  items.reduce((max, i) => (Date.parse(i.updatedAt) > Date.parse(max) ? i.updatedAt : max),
    items[0].updatedAt);

export function NotificationBell() {
  const { matches, conversations, userProfile, notificationsSeenAt, markNotificationsSeen } =
    useMindmate();

  const [open, setOpen] = useState(false);
  /**
   * What the panel was showing when it opened.
   *
   * Opening marks everything seen, which immediately empties `pending` — without
   * this the list would visibly delete itself under the cursor in the same frame
   * it appeared. The snapshot holds the rows still until the panel closes.
   */
  const [opened, setOpened] = useState<Item[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Unseen only: once looked at, an item is gone rather than greyed out. */
  const pending = useMemo<Item[]>(() => {
    if (!userProfile) return [];

    const messageCountByConversation = new Map(conversations.map(c => [c.id, c.messageCount]));
    const seenAt = notificationsSeenAt ? Date.parse(notificationsSeenAt) : null;
    const isUnseen = (updatedAt: string) => seenAt === null || Date.parse(updatedAt) > seenAt;
    const result: Item[] = [];

    for (const match of matches) {
      if (!isUnseen(match.updatedAt)) continue;
      const name = match.candidateProfile.displayName;

      if (
        match.status === 'connected' &&
        match.requestedByProfileId === userProfile.id &&
        match.conversationId
      ) {
        // Once they have actually written something, "say hello" is no longer
        // true and their message is already carried by the Conversations badge.
        // The acceptance is superseded here rather than lost.
        if ((messageCountByConversation.get(match.conversationId) ?? 0) > 0) continue;

        result.push({
          matchId: match.id,
          kind: 'accepted',
          displayName: name,
          href: `/chat/${match.conversationId}`,
          updatedAt: match.updatedAt,
        });
      } else if (match.status === 'requested' && match.direction === 'incoming') {
        result.push({
          matchId: match.id,
          kind: 'incoming',
          displayName: name,
          // /connections renders these as MatchCards with Connect and Pass.
          href: '/connections',
          updatedAt: match.updatedAt,
        });
      }
    }

    return result.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [matches, conversations, userProfile, notificationsSeenAt]);

  // The snapshot, plus anything that has arrived since — a request landing while
  // the panel is open should appear in it, not wait for the next open.
  const items = useMemo<Item[]>(() => {
    if (!opened) return pending;
    const byId = new Map(opened.map(i => [i.matchId, i]));
    for (const i of pending) byId.set(i.matchId, i);
    return [...byId.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [opened, pending]);

  const unseenCount = pending.length;

  const close = () => {
    setOpen(false);
    setOpened(null);
  };

  // Close the way every other menu on the web closes — same handling as the
  // chat overflow menu in app/chat/[id]/page.tsx.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      close();
      return;
    }

    setOpen(true);
    setOpened(pending);

    // Mark through the newest row on screen, not through now: anything that
    // arrives while the round trip is in flight has a later updatedAt and stays
    // unseen. Nothing showing means nothing to mark.
    if (pending.length > 0) markNotificationsSeen(newest(pending));
  };

  const label = unseenCount > 0 ? `Notifications, ${unseenCount} new` : 'Notifications';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls="notification-panel"
        title="Notifications"
        className={`relative flex items-center rounded-full px-2.5 py-1.5 text-sm font-medium transition-all sm:px-3.5 ${
          open
            ? 'bg-paper-200 text-ink-950 shadow-sm'
            : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
        }`}
      >
        <Bell className="h-4 w-4" />
        {unseenCount > 0 && (
          // Absolutely positioned rather than in flow: at 360px the nav has
          // roughly 56px of slack for an admin with every badge lit, and a
          // counted badge in flow spends most of it. This costs no width.
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-700 px-1 text-[10px] font-bold text-white"
          >
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          // Deliberately not role="menu": that role promises arrow-key
          // navigation between menuitems, and these are ordinary links reached
          // by Tab. aria-expanded plus aria-controls on the trigger is the
          // disclosure pattern that actually matches the behaviour, and the
          // list below announces its own length.
          aria-label="Connection notifications"
          // Two positionings, because anchoring to the bell does not work on a
          // phone. The bell sits ~100px from the right edge, so a 20rem panel
          // hung off it starts at a negative x and its left column is simply cut
          // off — the header and the first letter of each name disappear. Nothing
          // catches that by measuring overflow, since content spilling past the
          // left edge adds no scrollWidth.
          //
          // Below sm it is a full-width sheet under the header instead; from sm
          // up there is room to hang it off the bell properly.
          className="fixed inset-x-4 top-[4.5rem] z-50 animate-drop-in overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-card sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="border-b border-paper-300 px-4 py-2.5">
            <p className="font-serif text-sm font-medium text-ink-950">Connections</p>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-600">
              You&rsquo;re all caught up.
            </p>
          ) : (
            <ul className="max-h-[70dvh] divide-y divide-paper-300 overflow-y-auto">
              {items.slice(0, MAX_ROWS).map(item => (
                <li key={item.matchId}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-paper-100 active:bg-paper-200 sm:px-4"
                  >
                    <Avatar displayName={item.displayName} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-ink-800">
                        <span className="font-semibold text-ink-950">{item.displayName}</span>
                        {item.kind === 'accepted'
                          ? ' accepted your invite'
                          : ' would like to connect with you'}
                      </p>

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
                        {item.kind === 'accepted' ? (
                          <Sparkles className="h-3 w-3 shrink-0 text-sage-700" />
                        ) : (
                          <Inbox className="h-3 w-3 shrink-0 text-accent-500" />
                        )}
                        <span className="truncate">
                          {item.kind === 'accepted' ? 'Say hello' : 'Waiting on you'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={item.updatedAt} className="shrink-0">
                          {formatListTimestamp(item.updatedAt)}
                        </time>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {items.length > MAX_ROWS && (
            <Link
              href="/connections"
              onClick={close}
              className="block border-t border-paper-300 px-4 py-2.5 text-center text-xs font-medium text-ink-600 transition-colors hover:bg-paper-200 hover:text-ink-950"
            >
              View all {items.length}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
