-- Mindmate Phase 3: real matching (pgvector), the consent state machine, and
-- realtime messaging.
--
-- Two policies from 001 are replaced here because both undermine the mutual-consent
-- invariant this phase implements:
--   * matches UPDATE had USING with no WITH CHECK. Postgres reuses USING as the check,
--     so either party could set status='connected' unilaterally — and the messages
--     policy is gated on exactly that value. Transitions now go through server routes
--     on the service role; clients get no direct write path.
--   * messages never verified that sender_profile_id belongs to the caller, so a user
--     could forge a message from the person they were talking to.

-- 1. Demo personas are real rows; the flag drives server-side auto-accept and UI labelling.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- 2. Candidate retrieval now also returns iana_timezone (the re-ranker's timezone factor
--    reads it and was getting nothing) and is_demo. Changing RETURNS TABLE requires a
--    DROP — CREATE OR REPLACE cannot alter a function's result type.
DROP FUNCTION IF EXISTS public.match_candidate_profiles(UUID, VECTOR(1536), FLOAT, INT);

CREATE FUNCTION public.match_candidate_profiles(
  target_profile_id UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  display_name VARCHAR,
  age SMALLINT,
  city_or_timezone VARCHAR,
  iana_timezone TEXT,
  curiosity_profile TEXT,
  is_demo BOOLEAN,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
-- SECURITY DEFINER is what lets candidate retrieval read other users' rows past the
-- own-row-only profiles policy. Keep the search_path pinned.
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.age,
    p.city_or_timezone,
    p.iana_timezone,
    p.curiosity_profile,
    p.is_demo,
    p.created_at,
    1 - (p.profile_embedding <=> query_embedding) AS similarity
  FROM public.profiles p
  WHERE p.id <> target_profile_id
    AND p.visibility = 'discoverable'
    AND p.profile_embedding IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.profile_a_id = target_profile_id AND m.profile_b_id = p.id)
         OR (m.profile_b_id = target_profile_id AND m.profile_a_id = p.id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_profile_id = target_profile_id AND b.blocked_profile_id = p.id)
         OR (b.blocker_profile_id = p.id AND b.blocked_profile_id = target_profile_id)
    )
    AND (1 - (p.profile_embedding <=> query_embedding)) > match_threshold
  ORDER BY p.profile_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Remove the client's ability to move a match's status. Every transition
--    (suggested -> requested -> connected / passed / unmatched) is validated in
--    app/api/matches/[id]/route.ts and written with the service role.
DROP POLICY IF EXISTS "Users update own matches" ON public.matches;

-- 4. Messages: same membership + connected gate for reads, plus a WITH CHECK on writes
--    proving the sender is the caller.
DROP POLICY IF EXISTS "Users access own messages" ON public.messages;
CREATE POLICY "Users access own messages"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      JOIN public.profiles p ON (p.id = m.profile_a_id OR p.id = m.profile_b_id)
      WHERE c.id = messages.conversation_id
        AND p.user_id = auth.uid()
        AND m.status = 'connected'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      JOIN public.profiles p ON (p.id = m.profile_a_id OR p.id = m.profile_b_id)
      WHERE c.id = messages.conversation_id
        AND p.user_id = auth.uid()
        AND m.status = 'connected'
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles sp
      WHERE sp.id = messages.sender_profile_id
        AND sp.user_id = auth.uid()
    )
  );

-- 5. idx_matches_profiles leads with profile_a_id, so it cannot serve the
--    "requests addressed to me" lookup.
CREATE INDEX IF NOT EXISTS idx_matches_profile_b
  ON public.matches(profile_b_id, status);

-- 6. Realtime message delivery. Guarded so re-running the migration is safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'messages'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
