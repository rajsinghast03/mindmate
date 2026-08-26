-- Mindmate: delete expired onboarding drafts on a clock, not on traffic.
--
-- An onboarding_drafts row holds a Curiosity Profile, display name, age and city,
-- written before an account exists. Two things already remove them:
--
--   1. Redemption. app/api/onboarding-draft/route.ts deletes the row the moment a
--      draft is successfully claimed. This is the normal path.
--   2. An opportunistic sweep in that same route, on both POST and GET.
--
-- Neither is a guarantee. Migration 008 keys this table on a random token with no
-- foreign key to profiles — which is exactly what makes it safe to accept a draft
-- before an account exists, but also means deleting an account cannot reach these
-- rows. And the opportunistic sweep only runs when somebody signs up. On a quiet
-- week nothing touches the endpoint and an abandoned draft simply sits there,
-- unreadable through the API but very much still stored.
--
-- The privacy policy tells people an unfinished draft is deleted automatically.
-- That should be true because of the clock, not because of luck.
--
-- HOURLY, not daily, and the reason is arithmetic: a draft stops being claimable
-- at 24 hours, so a daily job would leave it in the table for up to 48. Hourly
-- caps the real lifetime at ~25 hours, which is what the policy describes.
--
-- REQUIRES pg_cron. Enable it first under Database > Extensions in the Supabase
-- dashboard; it needs shared_preload_libraries and so cannot be turned on from a
-- plain CREATE EXTENSION here.
--
-- The check below RAISES rather than returning quietly, and that is the whole
-- point of it. The first version of this file emitted a NOTICE and returned, so
-- running it without the extension reported success, scheduled nothing, and gave
-- no visible sign of either — which is exactly what happened, and was only caught
-- because an expired probe row survived a scheduled run. A migration that cannot
-- do its job must say so where you cannot miss it. Re-running after enabling the
-- extension is safe and is the intended recovery.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE EXCEPTION
      'pg_cron is not enabled. Turn it on under Database > Extensions, then run this file again.'
      USING HINT =
        'Until then the opportunistic sweep in app/api/onboarding-draft/route.ts is the only cleanup, '
        'and it runs only when someone signs up.';
  END IF;

  -- Idempotent, matching the rest of the migrations: re-running replaces the job
  -- rather than raising on a duplicate name.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep-onboarding-drafts') THEN
    PERFORM cron.unschedule('sweep-onboarding-drafts');
  END IF;

  -- :17 past the hour rather than :00 — nothing depends on the exact minute, and
  -- staying off the top of the hour keeps this out of the way of everything else
  -- that defaults to it.
  PERFORM cron.schedule(
    'sweep-onboarding-drafts',
    '17 * * * *',
    $job$
      DELETE FROM public.onboarding_drafts
      WHERE updated_at < now() - interval '24 hours'
    $job$
  );

  RAISE NOTICE 'Scheduled sweep-onboarding-drafts (hourly, :17).';
END $$;

-- Verify with:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'sweep-onboarding-drafts';
-- and, after it has run at least once:
--   SELECT status, start_time, return_message FROM cron.job_run_details
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sweep-onboarding-drafts')
--    ORDER BY start_time DESC LIMIT 5;
