-- Mindmate: seen-state for the navbar notification bell.
--
-- The bell surfaces two things a user has to act on: an invite they sent that
-- was accepted, and an invite someone sent them. Both are derived at read time
-- from public.matches — there is no notifications table and deliberately so,
-- because every event the bell shows is already a row whose current status says
-- the same thing. What was missing is only "have I looked at this yet".
--
-- This is that, as a single high-water mark per profile: one row, one column,
-- one write each time the panel is opened. An item counts as unseen when its
-- matches.updated_at is later than last_seen_at, and a missing row means
-- everything is unseen.
--
-- Why updated_at is the right event time, with no new column needed: in both
-- cases the state the bell reports IS the row's most recent transition. A
-- 'requested' match was last written when the request was sent — the only other
-- writes are connect and pass, and both end the notification. A 'connected'
-- match was last written when it was accepted; the only other write is unmatch,
-- which likewise ends it.
--
-- Every statement is guarded so re-running the file is safe, matching 005-012.

CREATE TABLE IF NOT EXISTS public.notification_reads (
  profile_id   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- The mark can never be set into the future.
--
-- What the caller writes is the newest matches.updated_at the panel was showing,
-- so the mark clears exactly the items the user saw and nothing that arrived
-- during the round trip. That value is safe to trust as a *time* because it came
-- out of Postgres in the first place — set_updated_at() writes it from this same
-- clock — so the comparison the bell makes cannot drift the way it would if one
-- side were stamped by the API server's clock.
--
-- What it is not safe against is a client sending a far-future timestamp, which
-- would silence that account's bell permanently. RLS already limits the damage to
-- the caller's own row, but a self-inflicted stuck bell is still a support
-- problem, so clamp. In normal operation the clamp never fires: every value sent
-- is an updated_at that has already happened.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_notification_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_seen_at := LEAST(COALESCE(NEW.last_seen_at, NOW()), NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_reads_stamp ON public.notification_reads;
CREATE TRIGGER notification_reads_stamp
  BEFORE INSERT OR UPDATE ON public.notification_reads
  FOR EACH ROW EXECUTE FUNCTION public.stamp_notification_seen();

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Same shape as "Users manage own read state" on conversation_reads (007), minus
-- the conversation-membership half: there is no conversation here, so owning the
-- profile is the whole check. Both USING and WITH CHECK are needed — USING alone
-- would gate which rows you may touch without constraining what you write.
DROP POLICY IF EXISTS "Users manage own notification read state" ON public.notification_reads;
CREATE POLICY "Users manage own notification read state"
  ON public.notification_reads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = notification_reads.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = notification_reads.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- Exactly the three verbs the app uses, and no more.
--
-- The REVOKE has to come first and is the whole point: Supabase's default
-- privileges already grant the API roles everything on a new table in public, so
-- a bare GRANT of three verbs adds nothing and removes nothing — DELETE stays.
-- Verified the hard way: with only the GRANT below, a signed-in user could still
-- delete their own row. Same lesson as the table-level grant in 011.
--
-- DELETE is what is being withheld. Dropping the row means "unseen again", which
-- re-lights that account's whole bell. Nothing in the app does it, so nothing
-- should be able to.
REVOKE ALL ON public.notification_reads FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_reads TO authenticated;

-- Not added to the supabase_realtime publication, for the same reason
-- conversation_reads is not: the only client that needs to know the mark moved
-- is the one that moved it, and it already has the response.
