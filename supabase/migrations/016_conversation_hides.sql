-- Per-viewer conversation delete.
--
-- "Delete" here removes the thread from YOUR inbox only. The other person keeps
-- theirs untouched, and nothing is destroyed: conversations.match_id is
-- ON DELETE CASCADE down to messages, so a real delete would erase the other
-- person's copy of a conversation they never agreed to lose. That is not a
-- decision one party should be able to make for the other, and Unmatch already
-- exists for "end this".
--
-- If they write again afterwards the thread comes back, carrying only what was
-- said after the delete. The alternative — staying hidden forever — is a silent
-- black hole: someone messages you, you never find out, and to them you are
-- simply ignoring them.

CREATE TABLE IF NOT EXISTS public.conversation_hides (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  profile_id      UUID REFERENCES public.profiles(id)      ON DELETE CASCADE NOT NULL,
  hidden_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, profile_id)
);

ALTER TABLE public.conversation_hides ENABLE ROW LEVEL SECURITY;

-- Same shape as the conversation_reads policy in 007: the row must be yours AND
-- you must be a party to that conversation. Without the second clause a user
-- could write hide rows against strangers' conversations.
DROP POLICY IF EXISTS "Users manage own hidden conversations" ON public.conversation_hides;
CREATE POLICY "Users manage own hidden conversations"
  ON public.conversation_hides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = conversation_hides.profile_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      WHERE c.id = conversation_hides.conversation_id
        AND (m.profile_a_id = conversation_hides.profile_id
          OR m.profile_b_id = conversation_hides.profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = conversation_hides.profile_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      WHERE c.id = conversation_hides.conversation_id
        AND (m.profile_a_id = conversation_hides.profile_id
          OR m.profile_b_id = conversation_hides.profile_id)
    )
  );

-- ---------------------------------------------------------------------------
-- conversation_summaries now respects the hide mark.
-- ---------------------------------------------------------------------------
-- Two changes from 007: every message join is windowed to `> hidden_at`, so a
-- reappeared thread's counts and preview describe only the new messages; and a
-- hidden conversation with nothing new is dropped from the result entirely.
--
-- The window sits in the LEFT JOIN condition rather than a WHERE, which would
-- turn the outer join inner and silently drop empty conversations.
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
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH mine AS (
    SELECT c.id,
           COALESCE(r.last_read_at, '-infinity'::TIMESTAMPTZ) AS last_read_at,
           COALESCE(h.hidden_at, '-infinity'::TIMESTAMPTZ)    AS hidden_at,
           (h.conversation_id IS NOT NULL)                    AS is_hidden
    FROM public.conversations c
    JOIN public.matches m ON m.id = c.match_id
    LEFT JOIN public.conversation_reads r
      ON r.conversation_id = c.id
     AND r.profile_id = target_profile_id
    LEFT JOIN public.conversation_hides h
      ON h.conversation_id = c.id
     AND h.profile_id = target_profile_id
    WHERE m.profile_a_id = target_profile_id
       OR m.profile_b_id = target_profile_id
  ),
  totals AS (
    SELECT mine.id AS conversation_id,
           mine.is_hidden,
           COUNT(msg.id) AS message_count,
           COUNT(msg.id) FILTER (
             WHERE msg.sender_profile_id <> target_profile_id
               AND msg.created_at > mine.last_read_at
           ) AS unread_count
    FROM mine
    LEFT JOIN public.messages msg
      ON msg.conversation_id = mine.id
     AND msg.created_at > mine.hidden_at
    GROUP BY mine.id, mine.is_hidden
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
             AND msg.created_at > mine.hidden_at
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
  LEFT JOIN latest ON latest.conversation_id = totals.conversation_id
  WHERE NOT totals.is_hidden
     OR totals.message_count > 0;
$$;

-- Server-only, same as 007. A new function would otherwise inherit EXECUTE for
-- PUBLIC, and this one takes a caller-supplied profile id — see migration 009.
REVOKE EXECUTE ON FUNCTION public.conversation_summaries(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.conversation_summaries(UUID) FROM anon, authenticated;
