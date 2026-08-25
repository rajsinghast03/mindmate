-- Mindmate: re-key onboarding drafts from email to a secret token.
--
-- Migration 002 made `email` the primary key, and the POST handler that writes it
-- runs before anyone is authenticated — it has to, since the whole point is to carry
-- a draft across the signup round trip. That meant anyone could file a draft under
-- any address. The containment was downstream (/auth/complete never auto-saves a
-- server-sourced draft); the write itself was never closed.
--
-- Now the browser mints a random token, stores the draft under it, and that token
-- travels inside the confirmation email. Only the person who received the mail — the
-- address we just proved they own — can redeem it, once.
--
-- Dropping the table loses nothing durable: rows are onboarding drafts with a 24h
-- claim window, and the old email-keyed rows are unreachable by the new handler.

DROP TABLE IF EXISTS public.onboarding_drafts;

CREATE TABLE public.onboarding_drafts (
  token      TEXT PRIMARY KEY,
  draft      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

-- Service role only. There is no client that should touch this table directly:
-- the write happens pre-auth through a server route, and the read is a one-time
-- redemption keyed on a token the client would have to already hold.
DROP POLICY IF EXISTS "No direct client access" ON public.onboarding_drafts;
CREATE POLICY "No direct client access"
  ON public.onboarding_drafts FOR ALL
  USING (false);

-- Supports the TTL filter on redemption and a future sweep of expired rows.
CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_updated_at
  ON public.onboarding_drafts(updated_at);
