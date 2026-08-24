-- Live connection state.
--
-- 005 put `messages` on the realtime publication, so chat streams — but match status
-- did not, which meant the *other* party had to reload to notice a request arriving,
-- a request being accepted, or an unmatch. Those are precisely the moments the consent
-- flow hinges on, so they should not require a refresh.
--
-- RLS still applies to realtime: the "Users view own matches" SELECT policy from 001
-- means a subscriber only receives events for matches they are actually part of.

-- The client filters on profile_a_id / profile_b_id, but a DELETE only carries the
-- primary key under the default replica identity, so a cascade-delete (someone
-- deleting their account) would never reach the other party's subscription. FULL puts
-- the whole old row in the WAL. The table is small and low-traffic, so the extra WAL
-- volume is negligible next to leaving a stale connection on screen.
ALTER TABLE public.matches REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'matches'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END $$;
