-- Mindmate Phase 4 polish: unread state, a single-query inbox summary, and
-- authorization for the private Realtime channel that carries typing events.
--
-- Every statement is guarded so re-running the file is safe, matching 005/006.

-- ---------------------------------------------------------------------------
-- 1. Read state
--
-- One row per (conversation, reader). Absence means "never opened", which is
-- why the summary below coalesces to -infinity rather than requiring a row.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  profile_id      UUID REFERENCES public.profiles(id)      ON DELETE CASCADE NOT NULL,
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, profile_id)
);

ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

-- The client writes its own read marks, so this policy is the enforcement point:
-- the row must be yours AND you must be a party to that conversation. Same shape
-- as the messages policy in 005.
DROP POLICY IF EXISTS "Users manage own read state" ON public.conversation_reads;
CREATE POLICY "Users manage own read state"
  ON public.conversation_reads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = conversation_reads.profile_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      WHERE c.id = conversation_reads.conversation_id
        AND (m.profile_a_id = conversation_reads.profile_id
          OR m.profile_b_id = conversation_reads.profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = conversation_reads.profile_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      WHERE c.id = conversation_reads.conversation_id
        AND (m.profile_a_id = conversation_reads.profile_id
          OR m.profile_b_id = conversation_reads.profile_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Inbox summaries in one query
--
-- Replaces loadConversationSummaries(), which selected every message row of
-- every conversation and reduced them in Node just to get a count and a last
-- message. DISTINCT ON gives the last message; the FILTER gives the unread
-- count in the same pass. Both ride idx_messages_conversation.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.conversation_summaries(UUID);

CREATE FUNCTION public.conversation_summaries(target_profile_id UUID)
RETURNS TABLE (
  conversation_id     UUID,
  message_count       BIGINT,
  unread_count        BIGINT,
  last_message_id     UUID,
  last_message_body   TEXT,
  last_message_sender UUID,
  last_message_at     TIMESTAMPTZ
)
LANGUAGE sql
-- SECURITY DEFINER so the caller need not hold read rights on every row; the
-- membership join below is what scopes the result. See the REVOKE at the end —
-- this takes a caller-supplied profile id and must stay server-only.
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH mine AS (
    SELECT c.id,
           COALESCE(r.last_read_at, '-infinity'::TIMESTAMPTZ) AS last_read_at
    FROM public.conversations c
    JOIN public.matches m ON m.id = c.match_id
    LEFT JOIN public.conversation_reads r
      ON r.conversation_id = c.id
     AND r.profile_id = target_profile_id
    WHERE m.profile_a_id = target_profile_id
       OR m.profile_b_id = target_profile_id
  ),
  totals AS (
    SELECT mine.id AS conversation_id,
           COUNT(msg.id) AS message_count,
           COUNT(msg.id) FILTER (
             WHERE msg.sender_profile_id <> target_profile_id
               AND msg.created_at > mine.last_read_at
           ) AS unread_count
    FROM mine
    LEFT JOIN public.messages msg ON msg.conversation_id = mine.id
    GROUP BY mine.id
  ),
  latest AS (
    SELECT DISTINCT ON (msg.conversation_id)
           msg.conversation_id,
           msg.id,
           msg.body,
           msg.sender_profile_id,
           msg.created_at
    FROM public.messages msg
    JOIN mine ON mine.id = msg.conversation_id
    ORDER BY msg.conversation_id, msg.created_at DESC, msg.id DESC
  )
  SELECT totals.conversation_id,
         totals.message_count,
         totals.unread_count,
         latest.id,
         latest.body,
         latest.sender_profile_id,
         latest.created_at
  FROM totals
  LEFT JOIN latest ON latest.conversation_id = totals.conversation_id;
$$;

-- Server-only. Without this, any signed-in user could pass someone else's
-- profile id and read their entire inbox.
REVOKE EXECUTE ON FUNCTION public.conversation_summaries(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.conversation_summaries(UUID) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Private Realtime channel authorization (typing indicators)
--
-- Typing travels over Broadcast on a channel named `convo:<conversation-uuid>`.
-- Supabase evaluates RLS on realtime.messages for private channels; that table
-- already has RLS on with no policies, so today it denies every join. These two
-- policies only grant, and only to the two people in the conversation.
--
-- postgres_changes is unaffected — it has its own RLS path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_conversation_topic_member(topic TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  target UUID;
BEGIN
  -- Validate the shape before casting; an invalid uuid would raise, and a raise
  -- inside a policy is a 500 rather than a clean denial.
  --
  -- The optional `#<n>` suffix comes from uniqueChannelName() in
  -- lib/supabase/client.ts, which makes every mount join a fresh topic so React
  -- Strict Mode's remount cannot tear down its own subscription.
  IF topic IS NULL OR topic !~ '^convo:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(#[0-9]+)?$' THEN
    RETURN FALSE;
  END IF;

  target := substring(topic FROM 7 FOR 36)::UUID;

  RETURN EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.matches m ON m.id = c.match_id
    JOIN public.profiles p ON (p.id = m.profile_a_id OR p.id = m.profile_b_id)
    WHERE c.id = target
      AND p.user_id = auth.uid()
      AND m.status = 'connected'
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE $p$DROP POLICY IF EXISTS "Conversation members receive broadcast" ON realtime.messages$p$;
    EXECUTE $p$
      CREATE POLICY "Conversation members receive broadcast"
        ON realtime.messages FOR SELECT
        TO authenticated
        USING (
          realtime.messages.extension = 'broadcast'
          AND public.is_conversation_topic_member((SELECT realtime.topic()))
        )
    $p$;

    EXECUTE $p$DROP POLICY IF EXISTS "Conversation members send broadcast" ON realtime.messages$p$;
    EXECUTE $p$
      CREATE POLICY "Conversation members send broadcast"
        ON realtime.messages FOR INSERT
        TO authenticated
        WITH CHECK (
          realtime.messages.extension = 'broadcast'
          AND public.is_conversation_topic_member((SELECT realtime.topic()))
        )
    $p$;
  END IF;
END $$;

-- conversation_reads is deliberately NOT added to supabase_realtime: read marks
-- are applied locally by the client that wrote them, and streaming them would
-- only amplify refetches.
