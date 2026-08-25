-- Mindmate: make reports actionable, and close an anonymous-insert hole.
--
-- The blocks and reports tables have existed since 001 with nothing writing to
-- them; the chat overflow menu showed an alert() and quietly unmatched instead.
-- Before wiring up a UI, the reports table needs three things it did not have.

-- 1. What kind of report it is. `reason` stays as the reporter's own words; the
--    category is what makes a queue triageable.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_category_check'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_category_check CHECK (category IN (
        'harassment', 'spam', 'inappropriate', 'impersonation', 'safety', 'other'
      ));
  END IF;
END $$;

-- 2. Somewhere to record that a human looked. Without this every report is
--    permanently indistinguishable from an unread one.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_status_check'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_status_check CHECK (status IN (
        'open', 'reviewed', 'actioned', 'dismissed'
      ));
  END IF;
END $$;

-- 3. Which conversation it came from. A report about messages is close to
--    useless without the thread it refers to.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS conversation_id UUID
    REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_profile_id);

-- 4. Require a real reporter.
--
-- The 001 policy passed when `reporter_profile_id IS NULL`, so any authenticated
-- user could file unlimited unattributable reports against anyone. Anonymity from
-- the *reported* user is already guaranteed by the SELECT policy — they cannot
-- read reports about them — so nothing is lost by insisting the row records who
-- filed it.
DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Users create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = reporter_profile_id AND p.user_id = auth.uid()
    )
  );

-- 5. Blocks: the 001 policy is FOR ALL with USING and no WITH CHECK, which
--    Postgres reuses as the check — correct here, since it already requires the
--    blocker to be the caller. Stated explicitly so the next reader does not have
--    to re-derive it, and indexed for the lookups discovery does on every pass.
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_profile_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_profile_id);
