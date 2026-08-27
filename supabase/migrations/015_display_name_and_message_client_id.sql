-- Two unrelated integrity gaps, both of which let the client decide something the
-- database should have been deciding.
--
-- 1. `display_name` had no CHECK at all — unlike `age`, `curiosity_profile` and
--    `visibility`, which all got one in 001. `''` and `'   '` both satisfied
--    NOT NULL and VARCHAR(60), and PATCH /api/profile wrote them straight through.
--
-- 2. `messages` had no idempotency key, so a duplicate POST — a double-tap, or a
--    retry after a response was lost — created a second row. The client now sends
--    a `client_id` and the unique index below collapses the repeat.

-- ---------------------------------------------------------------------------
-- 1. Display name minimum length
-- ---------------------------------------------------------------------------

-- Report before enforcing. A silent NOT VALID leaves rows that the app will now
-- reject on their next save with no record that they existed.
DO $$
DECLARE
  offending INTEGER;
BEGIN
  SELECT count(*) INTO offending
  FROM public.profiles
  WHERE char_length(btrim(display_name)) < 3;

  IF offending > 0 THEN
    RAISE WARNING
      'display_name: % existing row(s) are shorter than 3 characters. They are left as-is; the constraint is NOT VALID so it applies only to new writes. Each will be rejected on its owner''s next profile save.',
      offending;
  END IF;
END $$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_min_length;

-- NOT VALID so the migration cannot fail on pre-existing short or blank rows.
-- It still enforces on every INSERT and UPDATE from here.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_min_length
  CHECK (char_length(btrim(display_name)) >= 3)
  NOT VALID;

-- ---------------------------------------------------------------------------
-- 2. Message idempotency key
-- ---------------------------------------------------------------------------

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_id UUID;

-- Partial, so the rows written before this migration — all with a NULL client_id
-- — do not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_client_id_key
  ON public.messages (conversation_id, client_id)
  WHERE client_id IS NOT NULL;

-- No grants needed: migration 011 applied column-level privileges to `profiles`
-- only, so `messages` still carries table-level INSERT, which covers a new
-- column. If column grants are ever added there, `client_id` must be in the list
-- or sending a message starts failing outright — see the 011 header for why.
