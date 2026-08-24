'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMindmate } from '@/context/mindmate-context';
import { createClient, uniqueChannelName } from '@/lib/supabase/client';
import { DbMessage, dbMessageToMessage } from '@/lib/supabase/message-mapper';
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
  MapPin,
} from 'lucide-react';

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string;

  const {
    conversations,
    userProfile,
    sendMessage,
    unmatchConversation,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = isSupabaseMode
    ? remoteConversation
    : conversations.find(c => c.id === conversationId);

  // If the other person unmatches, the realtime match subscription drops this
  // conversation from context. Only treat that as "ended" once we've actually seen
  // it listed, so a deep link that loads before context does isn't misread as closed.
  const seenInContext = useRef(false);
  const listedNow = conversations.some(c => c.id === conversationId);
  if (listedNow) seenInContext.current = true;
  const conversationEnded = isSupabaseMode && seenInContext.current && !listedNow;

  /** Merge by id — Realtime and the POST response can both deliver the same row. */
  const appendMessages = useCallback((incoming: Message[]) => {
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
        messageCount: messages.length,
        lastActivityAt: messages[messages.length - 1].createdAt,
      };
    });
  }, []);

  /**
   * Fetch the whole thread. Membership and the connected-status gate are enforced
   * by the messages RLS policy, so a non-member simply gets a 404.
   */
  const loadConversation = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (!res.ok) return null;
    const { conversation: loaded } = await res.json();
    return loaded as Conversation;
  }, [conversationId]);

  useEffect(() => {
    if (!isSupabaseMode || !conversationId) return;
    let cancelled = false;

    (async () => {
      setLoadingRemote(true);
      try {
        const loaded = await loadConversation();
        if (!cancelled && loaded) setRemoteConversation(loaded);
      } catch (e) {
        console.error('Failed to load conversation:', e);
      } finally {
        if (!cancelled) setLoadingRemote(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSupabaseMode, conversationId, loadConversation]);

  // Live delivery of the other person's messages.
  useEffect(() => {
    if (!isSupabaseMode || !conversationId) return;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const resync = () =>
      void loadConversation()
        .then(loaded => loaded && appendMessages(loaded.messages))
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
          payload => appendMessages([dbMessageToMessage(payload.new as DbMessage)])
        )
        // Realtime does not replay missed events, so pull the thread on every
        // (re)connect. appendMessages dedupes by id, so re-reading is harmless.
        .subscribe(status => {
          if (status === 'SUBSCRIBED') resync();
        });
    })();

    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isSupabaseMode, conversationId, appendMessages, loadConversation]);

  // Auto scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

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
        <h2 className="font-serif text-2xl font-medium text-ink-950 mb-2">
          Conversation not found
        </h2>
        <p className="text-xs text-ink-500 mb-6">
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

  const { candidateProfile, sharedQuestion, resonanceSummary, messages } = conversation;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || sending) return;

    if (!isSupabaseMode) {
      sendMessage(conversationId, text);
      setInputMessage('');
      return;
    }

    setInputMessage('');
    setSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSendError(err.error || 'Could not send that message.');
        setInputMessage(text);
        return;
      }

      const { message, reply } = await res.json();
      appendMessages([message, reply].filter(Boolean) as Message[]);
    } catch {
      setSendError('Could not send that message.');
      setInputMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleUnmatch = async () => {
    try {
      await unmatchConversation(conversationId);
    } catch (err) {
      console.error('Failed to unmatch:', err);
    }
    setShowUnmatchModal(false);
    router.push('/connections');
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col border-x border-paper-300 bg-paper-50 shadow-soft">
      {/* Top Conversation Header */}
      <div className="flex items-center justify-between border-b border-paper-300 bg-paper-100/90 px-4 py-3.5 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/connections"
            className="rounded-full p-1.5 text-ink-600 hover:bg-paper-200 hover:text-ink-950 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-200 text-ink-950 font-serif font-semibold border border-paper-300/80">
            {candidateProfile.displayName.charAt(0)}
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="font-serif text-lg font-medium text-ink-950 leading-tight">
                {candidateProfile.displayName}
              </h2>
              <span className="text-xs text-ink-500 font-sans">{candidateProfile.age}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-ink-500">
              <MapPin className="h-3 w-3 text-ink-400" />
              <span>{candidateProfile.cityOrTimezone}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowDossier(!showDossier)}
            className="flex items-center gap-1 rounded-full border border-paper-300 bg-paper-50 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-paper-200 transition-colors"
          >
            <Info className="h-3.5 w-3.5 text-accent-500" />
            <span className="hidden sm:inline">Approved Profile</span>
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-full p-2 text-ink-600 hover:bg-paper-200 hover:text-ink-950 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {/* Overflow Menu */}
          {showMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-paper-300 bg-paper-50 py-1.5 shadow-card animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowUnmatchModal(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-ink-700 hover:bg-paper-100 transition-colors text-left"
              >
                <UserX className="h-4 w-4 text-ink-500" />
                <span>Unmatch</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  alert('Thank you for reporting. Our safety team will review this user.');
                  void handleUnmatch();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-accent-600 hover:bg-accent-50 transition-colors text-left"
              >
                <ShieldAlert className="h-4 w-4 text-accent-500" />
                <span>Block & Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approved Profile Dossier Drawer */}
      {showDossier && (
        <div className="border-b border-paper-300 bg-paper-100 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-700">
              {candidateProfile.displayName}&apos;s Approved Curiosity Profile
            </span>
            <button
              onClick={() => setShowDossier(false)}
              className="text-xs text-ink-500 hover:text-ink-950"
            >
              Close ✕
            </button>
          </div>
          <p className="font-serif text-sm leading-relaxed text-ink-900 italic bg-paper-50 p-4 rounded-xl border border-paper-200">
            {candidateProfile.curiosityProfile
              ? `“${candidateProfile.curiosityProfile}”`
              : 'Their approved profile becomes visible once you are connected.'}
          </p>
        </div>
      )}

      {/* Pinned Shared Opener Question Header */}
      <div className="border-b border-dashed border-paper-300 bg-paper-100/50 p-4 sm:px-6">
        <div className="flex items-center gap-1.5 text-xs font-medium text-accent-700 mb-1">
          <HelpCircle className="h-3.5 w-3.5 text-accent-500" />
          <span>Shared Opening Question</span>
        </div>
        <p className="font-serif text-base sm:text-lg font-medium text-ink-950 leading-snug">
          &ldquo;{sharedQuestion}&rdquo;
        </p>
        <p className="mt-1 text-xs text-ink-500 font-sans">
          Resonance context: {resonanceSummary}
        </p>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="font-serif text-lg font-medium text-ink-950">
              A private conversation has begun
            </h4>
            <p className="text-xs text-ink-500 max-w-sm mt-1">
              Answer the shared question above or share a thought that comes to mind.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderProfileId === userProfile?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-ink-950 text-paper-50 rounded-br-none'
                      : 'bg-paper-200 text-ink-950 border border-paper-300/80 rounded-bl-none font-serif text-[15px]'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-[10px] text-ink-400 font-mono px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      {conversationEnded ? (
        <div className="border-t border-paper-300 bg-paper-100 p-5 text-center">
          <p className="font-serif text-base text-ink-950">This conversation has ended.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-500">
            {candidateProfile.displayName} is no longer connected with you. The thread is
            closed and no further messages can be sent.
          </p>
          <Link
            href="/connections"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-950 px-5 py-2.5 text-xs font-medium text-paper-50 hover:bg-ink-800 transition-colors"
          >
            <span>Back to conversations</span>
          </Link>
        </div>
      ) : (
      <div className="border-t border-paper-300 bg-paper-100 p-3 sm:p-4">
        {sendError && (
          <p className="mb-2 text-xs font-medium text-accent-600">{sendError}</p>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            rows={2}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${candidateProfile.displayName}... (Press Enter to send)`}
            className="flex-1 rounded-2xl border border-paper-300 bg-paper-50 p-3 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 resize-none"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || sending}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
              inputMessage.trim() && !sending
                ? 'bg-accent-500 text-white hover:bg-accent-600 shadow-soft active:scale-95'
                : 'bg-paper-300 text-ink-400 cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
      )}

      {/* Unmatch Confirmation Modal */}
      {showUnmatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-paper-300 bg-paper-50 p-6 shadow-card">
            <h3 className="font-serif text-xl font-medium text-ink-950 mb-2">
              Unmatch with {candidateProfile.displayName}?
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed mb-6">
              This will quietly remove this conversation and return them to the discovery pool. They will not be explicitly notified.
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
