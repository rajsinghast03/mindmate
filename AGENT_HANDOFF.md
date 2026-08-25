# Agent Handoff & Session State Tracker

> **Notice to any AI Agent or Developer resuming work on Mindmate:**  
> This file is your **active checkpoint**. Always read this file upon taking over the conversation to know the current phase, completed tasks, in-progress items, and immediate next steps. Update this file at the end of each work session.

---

## Quick Orientation

- **Project Name:** Mindmate
- **Core Concept:** An intellectual, curiosity-first connection platform where people meet through shared questions, curiosities, and ideas—not shallow bios, photos, or swipe feeds.
- **Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, Supabase (PostgreSQL + `pgvector` + Auth + Realtime), Google Gemini free tier for embeddings + resonance synthesis (OpenAI optional; offline fallback synthesizer).
- **Design Aesthetic:** Calm editorial, warm paper background (`#FAF8F5`), dark ink text (`#18181B`), terracotta/coral accent (`#E05A47`), elegant serif headers (*Newsreader* / *Playfair Display*), no swipe/dating app clichés.
- **Development Strategy:** Local Interactive Prototype first with rich seed data & in-memory matching pipeline, transitioning seamlessly to Supabase + a live AI provider.

---

## Project Status Overview

| Metric | Status |
| :--- | :--- |
| **Current Phase** | **Phase 3: AI Matching & pgvector (code complete, awaiting live activation)** |
| **Active Milestone** | Activated. Browser-side consent + security verification outstanding |
| **Build Health** | `next build` and `tsc --noEmit` both clean |
| **Last Updated** | 2026-08-24 |

> **✅ Live and activated.** Migration 005 is applied, `GEMINI_API_KEY` and `SUPABASE_SECRET_KEY`
> are set, the 8 demo personas are seeded with embeddings, and pgvector retrieval was verified
> returning sensible ranked candidates. Remaining verification is browser-side: the two-account
> consent handshake and the three negative security tests in the Phase 3 plan.
>
> Placeholder env values are detected in `lib/config.ts` and reported explicitly rather than
> failing as an opaque "Invalid API key".

---

## Context Files Index

| File | Purpose |
| :--- | :--- |
| [`mindmate-build-brief.md`](file:///home/rajsinghast03/dev/mindmate/mindmate-build-brief.md) | Original product build brief and product requirements |
| [`AGENT_HANDOFF.md`](file:///home/rajsinghast03/dev/mindmate/AGENT_HANDOFF.md) | **(This file)** Active agent state, session log, and resume instructions |
| [`ROADMAP.md`](file:///home/rajsinghast03/dev/mindmate/ROADMAP.md) | Granular roadmap with phased checklists, acceptance criteria & tasks |
| [`ARCHITECTURE.md`](file:///home/rajsinghast03/dev/mindmate/ARCHITECTURE.md) | System architecture, hybrid AI matching algorithm, and privacy design |
| [`DATABASE_SCHEMA.md`](file:///home/rajsinghast03/dev/mindmate/DATABASE_SCHEMA.md) | Supabase/PostgreSQL schema, pgvector setup, RLS policies, and triggers |
| [`DESIGN_SYSTEM.md`](file:///home/rajsinghast03/dev/mindmate/DESIGN_SYSTEM.md) | Editorial typography, color palettes, UI components, and motion specs |
| [`README.md`](file:///home/rajsinghast03/dev/mindmate/README.md) | Developer onboarding guide, scripts, and environment configuration |

---

## Active Checklist & Immediate Next Steps

### Completed in Phase 1
- [x] Initialized Next.js 15 App Router project with TypeScript, Tailwind CSS, and Google Fonts (*Newsreader* + *Inter*).
- [x] Implemented Calm Editorial Design System with warm paper tokens, ink typography, and custom UI components.
- [x] Created `types/index.ts` with complete domain models (`Profile`, `Match`, `Conversation`, `Message`).
- [x] Created `data/seed-profiles.ts` with 8+ authentic, rich curiosity profiles and sample inspiration data.
- [x] Implemented hybrid re-ranking engine in `lib/matching/reranker.ts` using the multi-factor weighted formula.
- [x] Implemented AI qualitative resonance & starter question synthesizer in `lib/matching/synthesizer.ts` (with hosted-provider support + offline fallback).
- [x] Implemented client state management in `context/mindmate-context.tsx` with `localStorage` persistence and simulated messaging responses.
- [x] Built Landing Page (`app/page.tsx`) with copyable ChatGPT prompt, 3-step guide, and mock introduction card.
- [x] Built Curiosity Profile Onboarding (`app/onboarding/paste/page.tsx` & `app/onboarding/review/page.tsx`) with live word counter, inspiration drawer, age verification, and privacy guarantees.
- [x] Built Calm Match Discovery Deck (`app/discover/page.tsx`) with curated 1–3 cards, resonance explanations, shared questions, and pass/connect flows.
- [x] Built Connections List (`app/connections/page.tsx`) and Real-time Private Chat (`app/chat/[id]/page.tsx`) with pinned icebreakers and unmatch/report modals.
- [x] Built User Profile & Privacy Control (`app/profile/page.tsx`) with pause discovery and hard data deletion.
- [x] Built Server API route (`app/api/match/route.ts`).
- [x] Verified zero-error compilation with `npm run build`.

### Completed in Phase 3 (AI Matching, Consent State Machine & Realtime Chat)
- [x] **Embeddings** — `lib/matching/embeddings.ts`, Gemini-first with OpenAI fallback, raw fetch, no SDK.
      `gemini-embedding-001` at `outputDimensionality: 1536` keeps the existing `VECTOR(1536)` column.
      Generated on profile create/update in `/api/profile` only when the curiosity text changed;
      non-fatal, so a save never fails because the provider is down. `npm run backfill:embeddings`
      repairs null rows, and `/api/match` self-heals a missing vector on demand.
- [x] **Real candidate retrieval** — `match_candidate_profiles` RPC now returns `iana_timezone`,
      `is_demo` and `created_at`, and is actually called. Matching no longer touches `SEED_PROFILES`
      in Supabase mode.
- [x] **Re-ranker uses real signals** — the 0.55 semantic factor is now pgvector cosine similarity
      instead of Jaccard keyword overlap (the keyword proxy remains as the local-demo-mode fallback).
      Cosine is calibrated from its natural 0.83–0.89 band onto [0,1]: fed raw it contributed only
      ~0.03 of score spread while the 0.15 complementary factor swung ~0.045, so the nominally
      dominant signal was effectively constant. Calibrated it contributes ~0.128.
      Freshness was `Math.sin(displayName.length)`, a deterministic function of name length; it is now
      profile recency.
- [x] **Persisted matches** — created once with LLM-synthesized resonance text and never regenerated.
      Pair keys are canonical (smaller uuid first) so `unique_profile_pair` prevents duplicate
      reverse rows.
- [x] **Consent state machine** — `suggested → requested → connected`, validated server-side in
      `app/api/matches/[id]/route.ts`. Connecting is now a *request*; the conversation opens only on
      mutual acceptance. Seeded demo personas (`is_demo`) auto-accept so one person can still see the
      whole flow.
- [x] **Provider hardening** — all AI calls retry 429/503/network/timeout three times with backoff
      and a 15s per-attempt cap (Node's fetch has no default timeout; an overloaded model hung
      indefinitely). If synthesis still fails, `/api/match` **skips** that candidate rather than
      persisting the offline template — resonance is written once and never regenerated, so a
      transient blip would otherwise stick a generic explanation to a real pair permanently.
- [x] **Realtime messaging** — messages persist to Supabase and stream over `postgres_changes`.
      The `setTimeout` canned-reply simulation is gone from Supabase mode.
- [x] **Realtime match state** (migration 006) — 005 streamed `messages` but not `matches`, so a
      request arriving, a request being accepted, or an unmatch only appeared on refresh. The
      provider now subscribes to both sides of the pair (postgres_changes filters can't express
      OR) and refetches, keeping Discover, Connections and the navbar badges in sync together.
      `matches` is set to `REPLICA IDENTITY FULL` so a cascade-delete from account deletion still
      reaches the counterpart. The chat screen closes the composer when the thread ends.
- [x] **Two RLS holes closed** (migration 005) — see Invariant 7 below.
- [x] **Raw-profile redaction** — `GET /api/matches` omits `curiosityProfile` until a match is
      `connected`; `CandidateSummary` makes that structural rather than a convention.
- [x] **Demo personas** — `npm run seed:demo` creates 8 real auth users + profiles + embeddings,
      idempotent. Personas now live in `data/seed-profiles.json`, shared by the app and the scripts.

### Up Next (Phase 4/5 remainder)
- [x] Typing indicators (ROADMAP 4.2) — private Broadcast channel, RLS-gated in migration 007.
- [x] Inbox rebuild, server-backed unread state, message pagination (ROADMAP 4.4).
- [ ] Delivery state / read receipts (ROADMAP 4.2).
- [x] `match_candidate_profiles` locked down (migration 009). It was callable with the
      **publishable key and no session at all** — verified returning 12 rows of raw
      `curiosity_profile` text, the field ARCHITECTURE.md §3 says stays hidden until a match is
      mutually connected. Postgres grants EXECUTE to PUBLIC by default, which is where `anon`
      and `authenticated` inherited it. 009 also sets `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE
      ON FUNCTIONS FROM PUBLIC`, so the next SECURITY DEFINER function starts closed — this was
      the second time that default caught us.
- [x] Blocks & reports UI (migration 010). Chat overflow menu opens a real dialog: six
      categories, optional free text, "also block" checked by default. Blocking writes through
      the user's own client (the blocks policy requires blocker = caller), then ends the match
      with the service role, which locks the thread since the messages policy needs `connected`.
      Discovery needed no change — `match_candidate_profiles` already excludes blocked pairs.
      Unblock lives on `/profile`. 010 also closed a hole in the 001 reports policy, which passed
      when `reporter_profile_id IS NULL` and so allowed unlimited unattributable reports against
      anyone; and added `category`, `status` and `conversation_id`, without which a report was
      untriageable.
- [x] **Report queue** at `/admin/reports` (ROADMAP 5.2). Filter by status, mark
      reviewed/actioned/dismissed, repeat-offender counts per reported profile.

      Access is an **`ADMIN_EMAILS` env var**, not a flag on `profiles`. The "Users manage own
      profile" policy from 001 is `FOR ALL` with `WITH CHECK (auth.uid() = user_id)` — that gates
      which *row* you may write, not which *columns*, so a user can PATCH any field on their own
      profile row. Verified: a plain user set their own `is_demo = true` and got a 200. An
      `is_admin` column there would be self-grantable in one request.
- [x] **Profile column privileges** (migration 011). RLS has no column granularity, so
      `WITH CHECK (auth.uid() = user_id)` let a user write *every* field on their own row. Three
      mattered: `profile_embedding` (what discovery matches on — a hand-written vector can sit
      close to everyone), `created_at` (read by `calculateFreshnessScore()` in
      `lib/matching/reranker.ts` — re-stamp it to stay permanently "new"), and `is_demo`
      (server-side auto-accept). Fixed with column grants; `app/api/profile/route.ts` now writes
      the embedding on the service role in both POST and PATCH.

      Two Postgres details worth keeping: a **table-level** INSERT/UPDATE grant covers every
      column, so a column-level REVOKE against it is a no-op — revoke at table level first, then
      grant back. And `upsert` compiles to `INSERT ... ON CONFLICT DO UPDATE SET user_id = ...`,
      whose privileges are checked **statically**, so `UPDATE(user_id)` is required even when no
      conflict can occur. Omitting it broke profile creation outright.
- [ ] Report queue shows metadata and the reporter's own words, not the reported messages —
      viewing those means an admin path around the messages RLS, which deserves its own design.
- [ ] Turnstile on the auth forms (ROADMAP 5.3) — now about credential stuffing, not email-bombing.

### Completed in Phase 2
- [x] SQL migration (`supabase/migrations/001_initial_schema.sql`) — profiles, matches, messages, blocks, reports, pgvector, RLS.
- [x] Supabase client setup (`@supabase/ssr`) — browser, server, middleware.
- [x] Auth UI — Google OAuth plus verified email/password (`/auth/login`, `/auth/signup`,
      `/auth/callback`, `/auth/confirm`, `/auth/forgot-password`, `/auth/reset-password`).
- [x] Profile CRUD API (`/api/profile` — GET, POST, PATCH, DELETE).
- [x] Context wired for Supabase mode with localStorage fallback for matches/chat.
- [x] Onboarding auth gate — draft saved in localStorage, plus a token-keyed server copy that
      rides inside the confirmation email so a different device can resume (migration 008).
- [x] **Location UX overhaul** — country→city cascading dropdowns (India default, 244 countries / ~4.6k cities via GeoNames-derived `data/world-cities.json`, regenerable with `scripts/generate-world-cities.mjs`). Profiles now store a clean display label (`city_or_timezone`) + structured `iana_timezone` (migration `003_profile_timezone.sql`); re-ranker computes DST-safe UTC offsets from IANA timezone with legacy `UTC±X` label parsing as fallback.
- [x] **Auth email infrastructure** — custom domain `mindmate.site` verified on Resend
      (SPF/DKIM via CNAME forge records); Resend SMTP wired into Supabase. Email is now used by
      the **email/password path only** — signup confirmation and password reset. Google sign-in
      sends nothing.

      **"Confirm email" is ON.** It used to be off deliberately, on the reasoning that a magic
      link is itself proof of inbox ownership — that reasoning noted "revisit if passwords are
      ever added", and passwords are now here. With passwords and confirmation off, anyone could
      register an address they do not own.

      Templates live at `supabase/templates/confirm-signup.html` and `reset-password.html`;
      re-paste into the dashboard after edits. Both use `{{ .TokenHash }}` against `/auth/confirm`
      rather than the default confirmation URL, because `@supabase/ssr` uses PKCE and the code
      verifier does not exist in the browser that opens the email. Auth-abuse prevention
      (Turnstile) tracked in ROADMAP 5.3.

      **Signup discloses whether an address is registered.** Supabase returns an obfuscated
      user with an empty `identities` array for an existing address; `components/auth-form.tsx`
      detects that and says so. This reverses the earlier non-disclosing stance and makes signup
      an account-enumeration oracle — a deliberate, user-requested trade, taken because the
      alternative sent people to an inbox that would never receive anything. /auth/forgot-password
      stays non-disclosing.
- [x] **Logo simplification** — coral spark dot removed from `LogoMark` SVG everywhere; serif-M-only inside ink circle. Wordmark optically aligned via `translate-y-[0.06em]`.

> **Note:** Apply migrations in order. Instances that already ran `001` still need `002`–`005`.
> `005_phase3_matching.sql` is required for Phase 3 to function at all — it adds `is_demo`,
> rebuilds the retrieval RPC, closes the two RLS holes, and adds `messages` to the realtime
> publication.

---

## Key Architectural Invariants & Rules

1. **No Swipe Feeds & No Forced Labels:** Never introduce swiping or forced categorizations (e.g. "dating", "networking").
2. **Mutual Consent Only:** Chat is locked until both parties explicitly click "I'd like to connect".
   Enforced in three places, deliberately: the server-validated transition table, the absence of any
   client UPDATE policy on `matches`, and the `messages` policy gated on `status = 'connected'`.
3. **No Fake Scores:** No "92% compatibility" numbers; only human, qualitative resonance explanations.
4. **Privacy First:** Raw Curiosity Profiles are not publicly indexed or displayed to unapproved matches. Only high-level themes and approved resonance cards are displayed.
5. **Deterministic Re-ranking Formula:**
   $$\text{Score} = 0.55(\text{Semantic}) + 0.15(\text{ConvStyle}) + 0.15(\text{Complementary}) + 0.10(\text{Timezone}) + 0.05(\text{Freshness})$$
6. **Graceful Fallbacks:** The app must work smoothly in local demo/mock mode with pre-seeded rich profiles, while seamlessly connecting to Supabase and a hosted AI provider when environment keys are provided.
7. **Never Let Clients Set Match Status:** Migration 001's `matches` UPDATE policy had a `USING`
   clause and no `WITH CHECK`. Postgres reuses `USING` as the check on UPDATE, so either party could
   set `status = 'connected'` on themselves and unlock messaging without the other person agreeing.
   Migration 005 drops that policy; transitions are server-only. Separately, the `messages` policy
   never verified `sender_profile_id` belonged to the caller — a user could forge a message *from*
   the person they were talking to. Both are now closed; do not reintroduce a client-side write path
   to either table.

---

## Instructions for Next Agent

1. Check this file (`AGENT_HANDOFF.md`) and [`ROADMAP.md`](file:///home/rajsinghast03/dev/mindmate/ROADMAP.md).
2. Continue executing the next unchecked item in the **Up Next** section.
3. Keep code modular, clean, and well-typed.
4. Update [`AGENT_HANDOFF.md`](file:///home/rajsinghast03/dev/mindmate/AGENT_HANDOFF.md) and [`ROADMAP.md`](file:///home/rajsinghast03/dev/mindmate/ROADMAP.md) upon completing tasks or reaching milestone boundaries.
