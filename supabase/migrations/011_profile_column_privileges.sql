-- Mindmate: stop users writing profile columns the app derives for them.
--
-- The "Users manage own profile" policy from 001 is FOR ALL with
-- WITH CHECK (auth.uid() = user_id). That gates which *row* you may write, not
-- which *columns* — RLS has no column granularity. So a signed-in user could
-- PATCH any field on their own profile row. Verified on this project: a plain
-- user set their own is_demo to true and got a 200 back.
--
-- Three columns matter, and none of them are cosmetic:
--
--   profile_embedding  what discovery matches on. A self-written vector can be
--                      crafted to sit close to everyone, putting you in every
--                      user's suggestions regardless of what you wrote.
--   created_at         read by calculateFreshnessScore() in lib/matching/
--                      reranker.ts. Re-stamping it keeps you permanently "new"
--                      and ranking higher.
--   is_demo            drives server-side auto-accept of connection requests,
--                      so marking yourself a demo persona auto-connects you to
--                      anyone who asks.
--
-- Column privileges are the right tool; RLS cannot express this. Note the
-- table-level grant has to go first: a table-level INSERT/UPDATE covers every
-- column, and a column-level REVOKE against it is a no-op.
--
-- app/api/profile/route.ts now writes profile_embedding with the service role in
-- both POST and PATCH, so nothing in the app loses a write it needs.

REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;

-- Exactly what the create path in app/api/profile/route.ts sends.
GRANT INSERT (
  user_id,
  display_name,
  age,
  city_or_timezone,
  iana_timezone,
  curiosity_profile,
  visibility
) ON public.profiles TO anon, authenticated;

-- What the edit path sends, plus user_id.
--
-- user_id is here for a non-obvious reason: the create path uses upsert, which
-- PostgREST compiles to INSERT ... ON CONFLICT DO UPDATE SET user_id = ..., and
-- Postgres checks privileges statically rather than at runtime. Without
-- UPDATE(user_id) the statement is rejected even when no conflict occurs, so
-- creating a profile fails outright with "permission denied for table profiles".
--
-- Granting it costs nothing: the RLS policy's WITH CHECK (auth.uid() = user_id)
-- still applies to the new row, so the only value you can write is your own uid.
--
-- `updated_at` is absent because the profiles_updated_at trigger maintains it, and
-- triggers run as the table owner rather than the caller.
GRANT UPDATE (
  user_id,
  display_name,
  age,
  city_or_timezone,
  iana_timezone,
  curiosity_profile,
  visibility
) ON public.profiles TO anon, authenticated;

-- SELECT and DELETE are untouched: both are already scoped to the caller's own row
-- by the RLS policy, and column-level restrictions would break profile reads.
