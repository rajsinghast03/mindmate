'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, uniqueChannelName } from '@/lib/supabase/client';

/**
 * Live "is typing" over Supabase Realtime Broadcast.
 *
 * The channel is **private**: migration 007 puts SELECT/INSERT policies on
 * realtime.messages that only pass for the two people in the conversation, so a
 * stranger holding the conversation UUID cannot join and watch.
 *
 * Kept on its own channel rather than folded into the page's postgres_changes
 * subscription — the two transports authorize differently and mixing them makes
 * a failure in one look like a failure in the other.
 */

/** Don't re-announce more often than this while someone keeps typing. */
const SEND_THROTTLE_MS = 2_000;
/** Stop announcing after this long without a keystroke. */
const IDLE_STOP_MS = 3_000;
/** Clear a received indicator this long after the last event, in case `stop` is lost. */
const RECEIVE_EXPIRY_MS = 4_000;

type TypingPayload = { profileId: string };

export function useTypingChannel(
  conversationId: string | null,
  selfProfileId: string | null,
  enabled: boolean
) {
  const [peerTyping, setPeerTyping] = useState(false);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const lastSentAt = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !conversationId || !selfProfileId) return;

    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const clearExpiry = () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    };

    void (async () => {
      // A private channel is refused outright without a user JWT on the socket —
      // the same setAuth requirement the postgres_changes subscriptions carry.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const token = data.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase.channel(uniqueChannelName(`convo:${conversationId}`), {
        config: { private: true, broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if ((payload as TypingPayload)?.profileId === selfProfileId) return;
          setPeerTyping(true);
          clearExpiry();
          expiryTimer.current = setTimeout(() => setPeerTyping(false), RECEIVE_EXPIRY_MS);
        })
        .on('broadcast', { event: 'stop' }, ({ payload }) => {
          if ((payload as TypingPayload)?.profileId === selfProfileId) return;
          clearExpiry();
          setPeerTyping(false);
        })
        .subscribe(status => {
          if (status === 'CHANNEL_ERROR') {
            // Not fatal: messaging is unaffected, only the indicator is lost.
            console.warn('[mindmate] typing channel unavailable for', conversationId);
          }
        });

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      clearExpiry();
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = null;
      channelRef.current = null;
      setPeerTyping(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, conversationId, selfProfileId]);

  const send = useCallback(
    (event: 'typing' | 'stop') => {
      const channel = channelRef.current;
      if (!channel || !selfProfileId) return;
      void channel.send({ type: 'broadcast', event, payload: { profileId: selfProfileId } });
    },
    [selfProfileId]
  );

  const notifyStopped = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
    if (lastSentAt.current === 0) return;
    lastSentAt.current = 0;
    send('stop');
  }, [send]);

  /** Call on every keystroke; throttling and the idle stop are handled here. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentAt.current > SEND_THROTTLE_MS) {
      lastSentAt.current = now;
      send('typing');
    }

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(notifyStopped, IDLE_STOP_MS);
  }, [send, notifyStopped]);

  return { peerTyping, notifyTyping, notifyStopped };
}
