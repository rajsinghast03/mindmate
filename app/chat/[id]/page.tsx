'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMindmate } from '@/context/mindmate-context';
import { createClient, uniqueChannelName } from '@/lib/supabase/client';
import { DbMessage, dbMessageToMessage } from '@/lib/supabase/message-mapper';
import { useConversationChannel } from '@/lib/realtime/conversation-channel';
import { Avatar } from '@/components/avatar';
import { TypingIndicator } from '@/components/typing-indicator';
import { ReportDialog } from '@/components/report-dialog';
import { formatDateSeparator, formatMessageTime, isSameDay } from '@/lib/format/time';
import { Conversation, Message } from '@/types';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  ShieldAlert,
  UserX,
  HelpCircle,
  Sparkles,
  Info,
  ChevronDown,
  ArrowDown,
  Loader2,
  RotateCcw,
} from 'lucide-react';

/** Consecutive messages from one person inside this window render as one group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;
/** How close to the bottom still counts as "following the conversation". */
const STICK_THRESHOLD_PX = 80;
/** Scroll distance from the top that triggers the next page. */
const LOAD_MORE_THRESHOLD_PX = 120;
const COMPOSER_MAX_HEIGHT_PX = 132;

type ScrollAnchor = { height: number; top: number };

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string;

  const {
    conversations,
    userProfile,
    sendMessage,
    unmatchConversation,
    markConversationRead,
    setActiveConversationId,
    isLoaded,
    isSupabaseMode,
  } = useMindmate();

  const [inputMessage, setInputMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [remoteConversation, setRemoteConversation] = useState<Conversation | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(isSupabaseMode);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [unseenBelow, setUnseenBelow] = useState(false);
  const [questionOverride, setQuestionOverride] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Set just before a prepend so the layout effect can restore the reading position. */
  const pendingAnchor = useRef<ScrollAnchor | null>(null);
  const stickToBottom = useRef(true);
  const hasRenderedOnce = useRef(false);

  const conversation = isSupabaseMode
    ? remoteConversation
    : conversations.find(c => c.id === conversationId);

  // If the other person unmatches, the realtime match subscription drops this
  // conversation from context. Only treat that as "ended" once we've actually seen
  // it listed, so a deep link that loads before context does isn't misread as closed.
  const seenInContext = useRef(false);
  const listedNow = conversations.some(c => c.id === conversationId);
  if (listedNow) seenInContext.current = true;
  // `leaving` covers unmatching from this page: the context refetch drops the
  // conversation before the redirect lands, which would otherwise flash "This
  // conversation has ended" at someone who is already on their way out.
  const conversationEnded = isSupabaseMode && seenInContext.current && !listedNow && !leaving;

  const { peerTyping, notifyTyping, notifyStopped, peerReadAt, setPeerReadAt, notifyRead } =
    useConversationChannel(
      conversationId,
      userProfile?.id ?? null,
      isSupabaseMode && !conversationEnded
    );

  /** Merge by id — Realtime, the POST response and a resync can all carry the same row. */
  const mergeMessages = useCallback((incoming: Message[]) => {
    setRemoteConversation(prev => {
      if (!prev) return prev;
      const seen = new Set(prev.messages.map(m => m.id));
      const fresh = incoming.filter(m => m && !seen.has(m.id));
      if (!fresh.length) return prev;

      const messages = [...prev.messages, ...fresh].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
      return {
        ...prev,
        messages,
        messageCount: Math.max(prev.messageCount, messages.length),
        lastActivityAt: messages[messages.length - 1].createdAt,
      };
    });
  }, []);

  /** Swap the optimistic bubble for the rows the server actually stored. */
  const settleOptimistic = useCallback((tempId: string, settled: Message[]) => {
    setRemoteConversation(prev => {
      if (!prev) return prev;
      const seen = new Set(prev.messages.filter(m => m.id !== tempId).map(m => m.id));
      const messages = [
        ...prev.messages.filter(m => m.id !== tempId),
        ...settled.filter(m => m && !seen.has(m.id)),
      ].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

      return {
        ...prev,
        messages,
        messageCount: messages.length,
        lastActivityAt: messages.at(-1)?.createdAt ?? prev.lastActivityAt,
      };
    });
  }, []);

  const markFailed = useCallback((tempId: string) => {
    setRemoteConversation(prev =>
      prev
        ? {
            ...prev,
            messages: prev.messages.map(m =>
              m.id === tempId ? { ...m, pending: false, failed: true } : m
            ),
          }
        : prev
    );
  }, []);

  /**
   * Fetch one page of the thread, newest first. Membership and the connected-status
   * gate are enforced by the messages RLS policy, so a non-member gets a 404.
   */
  const fetchPage = useCallback(
    async (before?: string) => {
      const url = new URL(`/api/conversations/${conversationId}/messages`, window.location.origin);
      if (before) url.searchParams.set('before', before);

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      return (await res.json()) as {
        conversation: Conversation;
        peerLastReadAt: string | null;
        page: { hasMore: boolean; oldestCursor: string | null };
      };
    },
    [conversationId]
  );

  // Initial page.
  useEffect(() => {
    if (!isSupabaseMode || !conversationId) return;
    let cancelled = false;

    (async () => {
      setLoadingRemote(true);
      try {
        const result = await fetchPage();
        if (cancelled || !result) return;
        setRemoteConversation(result.conversation);
        setHasMore(result.page.hasMore);
        if (result.peerLastReadAt) {
          setPeerReadAt(prev =>
            !prev || result.peerLastReadAt! > prev ? result.peerLastReadAt! : prev
          );
        }
      } catch (e) {
        console.error('Failed to load conversation:', e);
      } finally {
        if (!cancelled) setLoadingRemote(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSupabaseMode, conversationId, fetchPage]);

  // Live delivery of the other person's messages.
  useEffect(() => {
    if (!isSupabaseMode || !conversationId) return;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Realtime does not replay what was missed, so pull the newest page on every
    // (re)connect and on refocus. mergeMessages dedupes, so re-reading is harmless
    // — and since this is one page rather than the whole thread, it stays cheap.
    const resync = () =>
      void fetchPage()
        .then(result => {
          if (!result) return;
          mergeMessages(result.conversation.messages);
          if (result.peerLastReadAt) {
            setPeerReadAt(prev =>
              !prev || result.peerLastReadAt! > prev ? result.peerLastReadAt! : prev
            );
          }
        })
        .catch(() => {});

    void (async () => {
      // The socket must carry the user's JWT before joining: postgres_changes
      // evaluates RLS at join time, and a channel joined without one reports
      // SUBSCRIBED and then silently receives nothing.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const token = data.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase
        .channel(uniqueChannelName(`messages:${conversationId}`))
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          payload => {
            mergeMessages([dbMessageToMessage(payload.new as DbMessage)]);
            if (!stickToBottom.current) setUnseenBelow(true);
          }
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') resync();
        });
    })();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      resync();
      markConversationRead(conversationId);
      notifyRead(new Date().toISOString());
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isSupabaseMode, conversationId, mergeMessages, fetchPage, markConversationRead, notifyRead, setPeerReadAt]);

  const messages = conversation?.messages ?? [];

  /**
   * Only the newest message I sent carries a receipt.
   *
   * A tick on every bubble is noise, and reads as a delivery dashboard rather than
   * a conversation. One quiet line at the bottom answers the only question anyone
   * actually has: did they see it?
   */
  const lastOwnMessageId = [...messages]
    .reverse()
    .find(m => m.senderProfileId === userProfile?.id && !m.pending && !m.failed)?.id;

  // Tell the provider which thread is open so an arriving message here never
  // lights the navbar badge, then clear the badge that is already there.
  useEffect(() => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    return () => setActiveConversationId(null);
  }, [conversationId, setActiveConversationId]);

  useEffect(() => {
    if (!conversationId || typeof document === 'undefined') return;
    if (document.visibilityState !== 'visible') return;
    markConversationRead(conversationId);
    // Same moment, broadcast: their receipt updates without waiting for a refetch.
    notifyRead(new Date().toISOString());
  }, [conversationId, messages.length, markConversationRead, notifyRead]);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const apply = () => setCoarsePointer(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Close the overflow menu the way every other menu on the web closes.
  useEffect(() => {
    if (!showMenu) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [showMenu]);

  const loadOlder = useCallback(async () => {
    const el = listRef.current;
    const oldest = messages[0]?.createdAt;
    if (!el || !oldest || !hasMore || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const result = await fetchPage(oldest);
      if (!result) return;
      // Captured immediately before the state change; the layout effect restores
      // the reading position from it, otherwise a prepend yanks you to the top.
      pendingAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
      setHasMore(result.page.hasMore);
      mergeMessages(result.conversation.messages);
    } catch {
      // Leave hasMore alone; the next scroll retries.
    } finally {
      setLoadingOlder(false);
    }
  }, [messages, hasMore, loadingOlder, fetchPage, mergeMessages]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distanceFromBottom < STICK_THRESHOLD_PX;
    if (stickToBottom.current && unseenBelow) setUnseenBelow(false);

    if (el.scrollTop < LOAD_MORE_THRESHOLD_PX) void loadOlder();
  }, [loadOlder, unseenBelow]);

  // One place decides scroll position: restoring an anchor after a prepend always
  // wins over following the bottom, or loading history would fight the autoscroll.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const anchor = pendingAnchor.current;
    if (anchor) {
      pendingAnchor.current = null;
      el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
      return;
    }

    if (!stickToBottom.current) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: hasRenderedOnce.current ? 'smooth' : 'auto',
    });
    hasRenderedOnce.current = true;
  }, [messages]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = true;
    setUnseenBelow(false);
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const resizeComposer = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }, []);

  useEffect(resizeComposer, [inputMessage, resizeComposer]);

  if (!isLoaded || loadingRemote) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h2 className="mb-2 font-serif text-2xl font-medium text-ink-950">
          Conversation not found
        </h2>
        <p className="mb-6 text-xs text-ink-500">
          This conversation may have been closed or unmatched.
        </p>
        <Link
          href="/connections"
          className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-6 py-2.5 text-xs font-medium text-paper-50"
        >
          <span>Return to Conversations</span>
        </Link>
      </div>
    );
  }

  const { candidateProfile, sharedQuestion, resonanceSummary } = conversation;

  /**
   * Seen if their last-read mark is at or after this message.
   *
   * No new schema: conversation_reads.last_read_at already exists from migration
   * 007, where it powers the unread badge. A read receipt is the same fact read
   * from the other direction.
   */
  const seenPeerMessage = (msg: Message) =>
    !!peerReadAt && Date.parse(peerReadAt) >= Date.parse(msg.createdAt);
  // The opener is the point of an empty thread, so it stays expanded until there
  // is something to read; after that it collapses out of the way on small screens.
  const questionOpen = questionOverride ?? messages.length === 0;

  const submit = async () => {
    const text = inputMessage.trim();
    if (!text || sending) return;

    notifyStopped();

    if (!isSupabaseMode) {
      sendMessage(conversationId, text);
      setInputMessage('');
      return;
    }

    const tempId = `pending-${crypto.randomUUID()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId,
      senderProfileId: userProfile?.id ?? '',
      body: text,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setInputMessage('');
    setSendError(null);
    setSending(true);
    stickToBottom.current = true;
    mergeMessages([optimistic]);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSendError(err.error || 'Could not send that message.');
        markFailed(tempId);
        return;
      }

      const { message, reply } = await res.json();
      settleOptimistic(tempId, [message, reply].filter(Boolean) as Message[]);
    } catch {
      setSendError('Could not send that message.');
      markFailed(tempId);
    } finally {
      setSending(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On a touch keyboard Enter is the only way to get a newline, so sending on it
    // would make multi-line messages impossible. There, the button is the action.
    if (coarsePointer) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const retryFailed = (msg: Message) => {
    setRemoteConversation(prev =>
      prev ? { ...prev, messages: prev.messages.filter(m => m.id !== msg.id) } : prev
    );
    setInputMessage(msg.body);
    composerRef.current?.focus();
  };

  const handleUnmatch = async () => {
    setLeaving(true);
    setShowUnmatchModal(false);
    try {
      await unmatchConversation(conversationId);
    } catch (err) {
      console.error('Failed to unmatch:', err);
      setLeaving(false);
      return;
    }
    router.push('/connections');
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-4xl flex-col overflow-hidden border-x border-paper-300 bg-paper-50 shadow-soft">
      {/* Top Conversation Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-paper-300 bg-paper-100/90 px-2 py-2.5 backdrop-blur-md sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/connections"
            aria-label="Back to conversations"
            className="rounded-full p-1.5 text-ink-600 transition-colors hover:bg-paper-200 hover:text-ink-950"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <Avatar displayName={candidateProfile.displayName} size="sm" />

          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h2 className="truncate font-serif text-base font-medium leading-tight text-ink-950 sm:text-lg">
                {candidateProfile.displayName}
              </h2>
              <span className="shrink-0 font-sans text-xs text-ink-500">
                {candidateProfile.age}
              </span>
            </div>
            <p className="truncate text-[11px] text-ink-500">{candidateProfile.cityOrTimezone}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div ref={menuRef} className="relative flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowDossier(!showDossier)}
            className="hidden items-center gap-1 rounded-full border border-paper-300 bg-paper-50 px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:bg-paper-200 sm:flex"
          >
            <Info className="h-3.5 w-3.5 text-accent-500" />
            <span>Approved Profile</span>
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Conversation options"
            aria-expanded={showMenu}
            className="rounded-full p-2 text-ink-600 transition-colors hover:bg-paper-200 hover:text-ink-950"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {/* Overflow Menu */}
          {showMenu && (
            <div className="absolute right-0 top-10 z-50 w-52 animate-drop-in rounded-xl border border-paper-300 bg-paper-50 py-1.5 shadow-card">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowDossier(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-ink-700 transition-colors hover:bg-paper-100 sm:hidden"
              >
                <Info className="h-4 w-4 text-accent-500" />
                <span>Approved profile</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowUnmatchModal(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-ink-700 transition-colors hover:bg-paper-100"
              >
                <UserX className="h-4 w-4 text-ink-500" />
                <span>Unmatch</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowReport(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50"
              >
                <ShieldAlert className="h-4 w-4 text-accent-500" />
                <span>Block &amp; report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approved Profile Dossier Drawer */}
      {showDossier && (
        <div className="shrink-0 animate-drop-in border-b border-paper-300 bg-paper-100 p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-700">
              {candidateProfile.displayName}&apos;s Approved Curiosity Profile
            </span>
            <button
              onClick={() => setShowDossier(false)}
              className="text-xs text-ink-500 hover:text-ink-950"
            >
              Close ✕
            </button>
          </div>
          <p className="max-h-48 overflow-y-auto rounded-xl border border-paper-200 bg-paper-50 p-4 font-serif text-sm italic leading-relaxed text-ink-900">
            {candidateProfile.curiosityProfile
              ? `“${candidateProfile.curiosityProfile}”`
              : 'Their approved profile becomes visible once you are connected.'}
          </p>
        </div>
      )}

      {/* Pinned Shared Opener Question — collapses once the thread has content */}
      <div className="shrink-0 border-b border-dashed border-paper-300 bg-paper-100/50 px-4 py-2.5 sm:px-6">
        <button
          onClick={() => setQuestionOverride(!questionOpen)}
          aria-expanded={questionOpen}
          className="flex w-full items-start gap-2 text-left"
        >
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-accent-700">
              Shared Opening Question
            </span>
            <span
              className={`block font-serif text-[15px] font-medium leading-snug text-ink-950 sm:text-lg ${
                questionOpen ? '' : 'truncate'
              }`}
            >
              &ldquo;{sharedQuestion}&rdquo;
            </span>
            {questionOpen && (
              <span className="mt-1 block font-sans text-xs text-ink-500">
                Resonance context: {resonanceSummary}
              </span>
            )}
          </span>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform ${
              questionOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
        >
          {loadingOlder && (
            <div className="flex items-center justify-center gap-2 pb-4 text-[11px] text-ink-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading earlier messages</span>
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <p className="pb-4 text-center text-[11px] text-ink-400">
              This is the beginning of your conversation.
            </p>
          )}

          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-lg font-medium text-ink-950">
                A private conversation has begun
              </h4>
              <p className="mt-1 max-w-sm text-xs text-ink-500">
                Answer the shared question above or share a thought that comes to mind.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const isMe = msg.senderProfileId === userProfile?.id;
              const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);

              const groupedWithPrev =
                !!prev &&
                !showDate &&
                prev.senderProfileId === msg.senderProfileId &&
                Date.parse(msg.createdAt) - Date.parse(prev.createdAt) < GROUP_WINDOW_MS;

              // The stamp belongs on the last bubble of a run, not under every one.
              const endsGroup =
                !next ||
                next.senderProfileId !== msg.senderProfileId ||
                !isSameDay(msg.createdAt, next.createdAt) ||
                Date.parse(next.createdAt) - Date.parse(msg.createdAt) >= GROUP_WINDOW_MS;

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-paper-300" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-paper-300" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                      groupedWithPrev ? 'mt-0.5' : 'mt-3'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
                        isMe
                          ? `bg-ink-950 text-paper-50 ${endsGroup ? 'rounded-br-md' : ''} ${
                              msg.pending ? 'opacity-60' : ''
                            } ${msg.failed ? 'bg-accent-800' : ''}`
                          : `border border-paper-300/80 bg-paper-200 font-serif text-[15px] text-ink-950 ${
                              endsGroup ? 'rounded-bl-md' : ''
                            }`
                      }`}
                    >
                      <span className="whitespace-pre-wrap break-words">{msg.body}</span>
                    </div>

                    {msg.failed ? (
                      <button
                        onClick={() => retryFailed(msg)}
                        className="mt-1 flex items-center gap-1 px-1 text-[10px] font-medium text-accent-600 hover:text-accent-700"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Not sent — tap to retry</span>
                      </button>
                    ) : (
                      endsGroup && (
                        <span className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-ink-400">
                          <span>{msg.pending ? 'Sending…' : formatMessageTime(msg.createdAt)}</span>
                          {msg.id === lastOwnMessageId && (
                            <span className={seenPeerMessage(msg) ? 'text-sage-600' : undefined}>
                              {seenPeerMessage(msg) ? 'Seen' : 'Sent'}
                            </span>
                          )}
                        </span>
                      )
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {unseenBelow && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 animate-rise-in items-center gap-1.5 rounded-full bg-ink-950 px-3.5 py-1.5 text-[11px] font-medium text-paper-50 shadow-card"
          >
            <ArrowDown className="h-3 w-3" />
            <span>New message</span>
          </button>
        )}
      </div>

      {/* Message Input Box */}
      {conversationEnded ? (
        <div className="shrink-0 border-t border-paper-300 bg-paper-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
          <p className="font-serif text-base text-ink-950">This conversation has ended.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-500">
            {candidateProfile.displayName} is no longer connected with you. The thread is closed
            and no further messages can be sent.
          </p>
          <Link
            href="/connections"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-950 px-5 py-2.5 text-xs font-medium text-paper-50 transition-colors hover:bg-ink-800"
          >
            <span>Back to conversations</span>
          </Link>
        </div>
      ) : (
        <div className="shrink-0 border-t border-paper-300 bg-paper-100 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
          {peerTyping && <TypingIndicator name={candidateProfile.displayName} />}

          {sendError && <p className="mb-2 text-xs font-medium text-accent-600">{sendError}</p>}

          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              ref={composerRef}
              rows={1}
              value={inputMessage}
              onChange={e => {
                setInputMessage(e.target.value);
                if (e.target.value.trim()) notifyTyping();
                else notifyStopped();
              }}
              onBlur={notifyStopped}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${candidateProfile.displayName}…`}
              className="max-h-[132px] min-h-[44px] flex-1 resize-none rounded-2xl border border-paper-300 bg-paper-50 px-3.5 py-2.5 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!inputMessage.trim() || sending}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all ${
                inputMessage.trim() && !sending
                  ? 'bg-accent-500 text-white shadow-soft hover:bg-accent-600 active:scale-95'
                  : 'cursor-not-allowed bg-paper-300 text-ink-400'
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {showReport && (
        <ReportDialog
          profileId={candidateProfile.id}
          displayName={candidateProfile.displayName}
          conversationId={conversationId}
          onClose={() => setShowReport(false)}
          onDone={didBlock => {
            // Blocking already ended the match server-side, so leave without
            // waiting for the realtime update to flip this thread to "ended".
            setShowReport(false);
            if (didBlock) {
              setLeaving(true);
              router.push('/connections');
            }
          }}
        />
      )}

      {/* Unmatch Confirmation Modal */}
      {showUnmatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-paper-300 bg-paper-50 p-6 shadow-card">
            <h3 className="mb-2 font-serif text-xl font-medium text-ink-950">
              Unmatch with {candidateProfile.displayName}?
            </h3>
            <p className="mb-6 text-xs leading-relaxed text-ink-600">
              This will quietly remove this conversation and return them to the discovery pool.
              They will not be explicitly notified.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowUnmatchModal(false)}
                className="rounded-full px-4 py-2 text-xs font-medium text-ink-600 hover:bg-paper-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUnmatch}
                className="rounded-full bg-accent-600 px-5 py-2 text-xs font-medium text-white hover:bg-accent-700"
              >
                Confirm Unmatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
