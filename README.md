# Mindmate

> **Meet people through the questions they can't stop asking.**  
> An intellectual, curiosity-first connection platform where matches are made through ideas, ongoing questions, and deep curiosities—not shallow bios, photos, or swipe feeds.

---

## Project Documentation & Context Hub

To maintain complete continuity across engineering sessions and agent context windows, the project is comprehensively documented across dedicated guides:

| Document | Description |
| :--- | :--- |
| [**`AGENT_HANDOFF.md`**](file:///home/rajsinghast03/dev/mindmate/AGENT_HANDOFF.md) | **Start here for AI agents & developers.** Active session state, completed milestones, and immediate next steps. |
| [**`ROADMAP.md`**](file:///home/rajsinghast03/dev/mindmate/ROADMAP.md) | Granular phase breakdown, task checklists, and acceptance criteria. |
| [**`ARCHITECTURE.md`**](file:///home/rajsinghast03/dev/mindmate/ARCHITECTURE.md) | System design, hybrid AI matching engine pipeline, and privacy model. |
| [**`DATABASE_SCHEMA.md`**](file:///home/rajsinghast03/dev/mindmate/DATABASE_SCHEMA.md) | PostgreSQL / Supabase schema, `pgvector` indexing, and Row Level Security (RLS). |
| [**`DESIGN_SYSTEM.md`**](file:///home/rajsinghast03/dev/mindmate/DESIGN_SYSTEM.md) | Editorial typography, warm paper color tokens, and UI component specifications. |
| [**`mindmate-build-brief.md`**](file:///home/rajsinghast03/dev/mindmate/mindmate-build-brief.md) | The original product build brief and requirements. |

---

## Core Concept & Principles

1. **AI-Assisted, User-Controlled:** Users copy a privacy-safe prompt to generate a 90–130 word *Curiosity Profile* using ChatGPT or write their own.
2. **Zero History Scraping:** Mindmate never asks for ChatGPT OAuth access, passwords, or raw conversation logs. Users paste, review, edit, and approve their own text.
3. **No Swipe Mechanics:** No infinite feeds, hot-or-not swiping, or addictive gamification. Users receive 1–3 carefully curated introductions.
4. **Qualitative Resonance:** Replaces fake numbers ("94% match") with meaningful editorial explanations of *why* two minds connect.
5. **Consent-Gated Conversations:** Both individuals must opt in before a private chat unlocks, beginning with a thoughtful shared question.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS + Tailwind Typography
- **Database & Auth:** Supabase (PostgreSQL, Row-Level Security, Auth)
- **Vector Search:** `pgvector` with Cosine Distance (`<=>`) index
- **AI Intelligence:** Google Gemini free tier (`gemini-embedding-001` at 1536 dims + `gemini-3.5-flash-lite` structured synthesizer), with OpenAI as an optional paid alternative
- **Deployment:** Vercel

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template (optional — app runs in local demo mode without Supabase)
cp .env.example .env.local

# 3. Run local development server
npm run dev

# 4. Open application
# http://localhost:3000
```

### Local Demo Mode (no Supabase)

Without Supabase env vars, the app works fully offline using `localStorage` and seed profiles — same as Phase 1.

### Supabase Setup (Phase 2 — Auth & Profiles)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in **SQL Editor**: paste contents of `supabase/migrations/001_initial_schema.sql`.
3. Enable **Email** auth under Authentication → Providers (Magic Link).
4. Add redirect URLs under Authentication → URL Configuration (add every origin you use):
   - `http://localhost:3000/auth/callback`
   - `http://YOUR_LAN_IP:3000/auth/callback` (for phone on same Wi‑Fi)
   - Site URL: whichever origin you use most (e.g. `http://localhost:3000`)
5. Copy credentials into `.env.local`:

   **Project URL** — open **Connect** (top of dashboard), or go to **Settings → Data API**.

   **Client key** — go to **Settings → API Keys**:
   - Use the **Publishable key** (`sb_publishable_...`) — recommended
   - Or the **anon** key under the **Legacy API Keys** tab — still works

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

6. Verify: `npm run verify:supabase` then restart `npm run dev`.
7. Run the remaining migrations in order: `002_onboarding_drafts.sql`, `003_profile_timezone.sql`, `004_curiosity_profile_validation.sql`, `005_phase3_matching.sql`, `006_realtime_matches.sql`.

### Matching Setup (Phase 3 — embeddings, consent, realtime chat)

Matching needs two more secrets that the client-side keys above don't cover. Placeholder values
are detected and reported explicitly, so if either is unfilled you'll get a clear 503 rather than
an opaque "Invalid API key".

```bash
GEMINI_API_KEY=...                 # embeddings + resonance synthesis (free tier)
SUPABASE_SECRET_KEY=sb_secret_...  # Settings → API Keys → Secret keys
```

The secret key is **server-only** and bypasses Row Level Security. Matching needs it because
the `profiles` policy is own-row-only, so a signed-in user cannot read anyone else's profile —
yet suggesting matches requires exactly that, plus inserting `matches` and `conversations` rows
that no client policy grants. It is read only inside route handlers via `lib/supabase/service.ts`
and never reaches the browser.

Use the new `sb_secret_...` key rather than the legacy `service_role` JWT: Supabase is retiring
anon/service_role keys by the end of 2026, and secret keys additionally return 401 if they ever
leak into a browser. `SUPABASE_SERVICE_ROLE_KEY` still works as a fallback.

**Both AI calls run on Google's free tier.** Get a key at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no credit card, no billing
account:

- **Embeddings** — `gemini-embedding-001` at `outputDimensionality: 1536`, which matches the
  existing `VECTOR(1536)` column exactly, so no migration is needed. Only the full 3072-dimension
  output is pre-normalized by Google, so the app L2-normalizes smaller outputs itself.
- **Resonance synthesis** — `gemini-3.5-flash-lite` with a `responseSchema`, giving schema-enforced
  JSON. Chosen over the flagship `gemini-3.7-flash`, which was timing out on the free tier; measured
  against the real prompt, flash-lite answered in ~1.5s vs ~6.6s for `gemini-2.5-flash` and held the
  second-person voice the match card needs.

Model IDs are env-overridable (`GEMINI_EMBEDDING_MODEL`, `GEMINI_CHAT_MODEL`) because Google
retires Flash models faster than this repo gets updated, and free-tier capacity varies by model.
All provider calls retry transient 429/503/timeout responses three times with backoff and a 15s
per-attempt timeout.

OpenAI remains supported as a paid alternative: set `OPENAI_API_KEY` and leave `GEMINI_API_KEY`
unset, and the app uses `text-embedding-3-small` and `gpt-4o-mini` instead. Gemini wins whenever
both keys are present.

Then check the provider and populate the candidate pool:

```bash
npm run verify:ai            # confirms 1536-dim unit vectors + a valid chat model ID
npm run seed:demo            # 8 demo personas as real users, with embeddings (idempotent)
npm run backfill:embeddings  # fills any profile whose embedding is null
```

Run `verify:ai` first — it catches the two failures that are otherwise hard to diagnose: an
embedding dimension that won't fit the column, and a retired chat model ID returning 404.

Demo personas are flagged `is_demo`. They auto-accept connection requests and reply in chat so a
single person can walk the whole flow; the UI labels them as demo profiles. Between two real
accounts the handshake is genuine — a request stays pending until the other person accepts.

With no AI key at all the app still runs: profiles save with a null embedding, matching returns
503 until you backfill, and the resonance synthesizer falls back to its offline generator.

### Custom SMTP (Resend — production email)

Supabase's built-in email service caps at ~2 emails/hour and locks template editing. Use Resend with a verified domain instead (free tier: 3,000 emails/month):

1. Add your domain at [resend.com](https://resend.com) → Domains → Add Domain.
2. Add the DNS records Resend shows (CNAME-based forge setup) at your registrar; verify propagation with `dig CNAME send.yourdomain.com +short` before clicking Verify.
3. Create an API key (SMTP password) under API Keys.
4. Supabase Dashboard → Project Settings → Authentication → SMTP Settings → Enable:
   - Host `smtp.resend.com` · Port `587` · Username `resend` · Password: your `re_...` key
   - Sender: e.g. `auth@yourdomain.com`
5. Customize the Magic Link template (Authentication → Emails → Templates) from `supabase/templates/magic-link.html`. Keep every `{{ .ConfirmationURL }}` occurrence intact.
6. Recommended settings for passwordless-only auth:
   - Authentication → Providers → Email → **Confirm email OFF** (the magic link itself proves inbox ownership).
   - Authentication → Rate Limits → raise "emails sent" to ~30/hour.

### Location dataset

Country/state/city data comes from GeoNames (`cities500` + admin divisions, CC-BY 4.0), served as per-country JSON from `public/geo/` and fetched on demand by the onboarding location picker. To regenerate after updating the source files:

```bash
node scripts/generate-world-cities.mjs /path/to/geonames-dumps
```

Display names are ASCII-normalized ("Ambala", not "Ambāla").
