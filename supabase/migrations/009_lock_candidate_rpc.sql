-- Mindmate: stop match_candidate_profiles handing out raw Curiosity Profiles.
--
-- The function is SECURITY DEFINER — that is deliberate and necessary, since it
-- has to read other people's rows past the own-row-only profiles policy in order
-- to do vector retrieval at all. What was missing is that Postgres grants EXECUTE
-- on new functions to PUBLIC by default, so `anon` and `authenticated` inherited
-- it. Combined with a caller-supplied target_profile_id and a caller-supplied
-- match_threshold, that made it a public read endpoint for the one field the
-- whole product is built on withholding:
--
--   POST /rest/v1/rpc/match_candidate_profiles
--   { "target_profile_id": "<anyone>", "query_embedding": [...],
--     "match_threshold": -1, "match_count": 50 }
--
-- Verified against this project before the fix: the publishable key alone, with no
-- session at all, returned 12 rows each carrying the full curiosity_profile text.
-- ARCHITECTURE.md §3 "Raw Profile Concealment" says that text stays hidden until a
-- match is mutually connected; toCandidateSummary() enforces it in the API layer,
-- and this RPC went around it.
--
-- The only caller is app/api/match/route.ts, which uses createServiceClient(), so
-- no application code loses anything here. Same treatment conversation_summaries
-- got in migration 007.

REVOKE EXECUTE ON FUNCTION
  public.match_candidate_profiles(UUID, VECTOR(1536), FLOAT, INT)
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION
  public.match_candidate_profiles(UUID, VECTOR(1536), FLOAT, INT)
  FROM anon, authenticated;

-- Explicit rather than relying on role inheritance, so a future change to default
-- privileges cannot quietly break candidate retrieval.
GRANT EXECUTE ON FUNCTION
  public.match_candidate_profiles(UUID, VECTOR(1536), FLOAT, INT)
  TO service_role;

-- Anything added later starts closed instead of open. Without this, the next
-- SECURITY DEFINER function repeats exactly this mistake.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
