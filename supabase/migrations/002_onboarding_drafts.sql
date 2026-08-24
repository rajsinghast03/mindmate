-- Temporary onboarding drafts (survives magic-link opens from email apps)
CREATE TABLE IF NOT EXISTS public.onboarding_drafts (
  email TEXT PRIMARY KEY,
  draft JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

-- No direct client access — only via API route handlers
DROP POLICY IF EXISTS "No direct client access" ON public.onboarding_drafts;
CREATE POLICY "No direct client access"
  ON public.onboarding_drafts FOR ALL
  USING (false);
