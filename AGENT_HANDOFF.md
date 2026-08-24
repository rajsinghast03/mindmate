# 🤖 Agent Handoff & Session State Tracker

> **Notice to any AI Agent or Developer resuming work on Mindmate:**  
> This file is your **active checkpoint**. Always read this file upon taking over the conversation to know the current phase, completed tasks, in-progress items, and immediate next steps. Update this file at the end of each work session.

---

## 📌 Quick Orientation

- **Project Name:** Mindmate
- **Core Concept:** An intellectual, curiosity-first connection platform where people meet through shared questions, curiosities, and ideas—not shallow bios, photos, or swipe feeds.
- **Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, Supabase (PostgreSQL + `pgvector` + Auth + Realtime), OpenAI API (with fallback mock synthesizer).
- **Design Aesthetic:** Calm editorial, warm paper background (`#FAF8F5`), dark ink text (`#18181B`), terracotta/coral accent (`#E05A47`), elegant serif headers (*Newsreader* / *Playfair Display*), no swipe/dating app clichés.
- **Development Strategy:** Local Interactive Prototype first with rich seed data & in-memory matching pipeline, transitioning seamlessly to Supabase + live OpenAI.

---

## 🧭 Project Status Overview

| Metric | Status |
| :--- | :--- |
| **Current Phase** | **Phase 2: Supabase Auth & Database Layer (COMPLETED) ➔ Ready for Phase 3: AI Matching & pgvector** |
| **Active Milestone** | Phase 2 code complete — apply migration to live Supabase instance to activate |
| **Build Health** | 🟢 Production build compiles successfully (`next build`) |
| **Last Updated** | 2026-08-24 |

---

## 📋 Context Files Index

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

## 🚀 Active Checklist & Immediate Next Steps

### Completed in Phase 1
- [x] Initialized Next.js 15 App Router project with TypeScript, Tailwind CSS, and Google Fonts (*Newsreader* + *Inter*).
- [x] Implemented Calm Editorial Design System with warm paper tokens, ink typography, and custom UI components.
- [x] Created `types/index.ts` with complete domain models (`Profile`, `Match`, `Conversation`, `Message`).
- [x] Created `data/seed-profiles.ts` with 8+ authentic, rich curiosity profiles and sample inspiration data.
- [x] Implemented hybrid re-ranking engine in `lib/matching/reranker.ts` using the multi-factor weighted formula.
- [x] Implemented AI qualitative resonance & starter question synthesizer in `lib/matching/synthesizer.ts` (with OpenAI support + offline fallback).
- [x] Implemented client state management in `context/mindmate-context.tsx` with `localStorage` persistence and simulated messaging responses.
- [x] Built Landing Page (`app/page.tsx`) with copyable ChatGPT prompt, 3-step guide, and mock introduction card.
- [x] Built Curiosity Profile Onboarding (`app/onboarding/paste/page.tsx` & `app/onboarding/review/page.tsx`) with live word counter, inspiration drawer, age verification, and privacy guarantees.
- [x] Built Calm Match Discovery Deck (`app/discover/page.tsx`) with curated 1–3 cards, resonance explanations, shared questions, and pass/connect flows.
- [x] Built Connections List (`app/connections/page.tsx`) and Real-time Private Chat (`app/chat/[id]/page.tsx`) with pinned icebreakers and unmatch/report modals.
- [x] Built User Profile & Privacy Control (`app/profile/page.tsx`) with pause discovery and hard data deletion.
- [x] Built Server API route (`app/api/match/route.ts`).
- [x] Verified zero-error compilation with `npm run build`.

### Up Next (Phase 3: AI Matching Engine & Vector Search)
- [ ] Embedding generation pipeline (`text-embedding-3-small` on profile save).
- [ ] Wire `match_candidate_profiles` RPC for vector retrieval.
- [ ] Persist matches to Supabase `matches` table.

### Completed in Phase 2
- [x] SQL migration (`supabase/migrations/001_initial_schema.sql`) — profiles, matches, messages, blocks, reports, pgvector, RLS.
- [x] Supabase client setup (`@supabase/ssr`) — browser, server, middleware.
- [x] Magic Link auth UI (`/auth/login`, `/auth/callback`).
- [x] Profile CRUD API (`/api/profile` — GET, POST, PATCH, DELETE).
- [x] Context wired for Supabase mode with localStorage fallback for matches/chat.
- [x] Onboarding auth gate — draft profile saved in sessionStorage, resume after login.
- [x] **Location UX overhaul** — country→city cascading dropdowns (India default, 244 countries / ~4.6k cities via GeoNames-derived `data/world-cities.json`, regenerable with `scripts/generate-world-cities.mjs`). Profiles now store a clean display label (`city_or_timezone`) + structured `iana_timezone` (migration `003_profile_timezone.sql`); re-ranker computes DST-safe UTC offsets from IANA timezone with legacy `UTC±X` label parsing as fallback.

> **Note:** Apply `supabase/migrations/003_profile_timezone.sql` to live Supabase instances that already ran `001`.

---

## 🔑 Key Architectural Invariants & Rules

1. **No Swipe Feeds & No Forced Labels:** Never introduce swiping or forced categorizations (e.g. "dating", "networking").
2. **Mutual Consent Only:** Chat is locked until both parties explicitly click "I'd like to connect".
3. **No Fake Scores:** No "92% compatibility" numbers; only human, qualitative resonance explanations.
4. **Privacy First:** Raw Curiosity Profiles are not publicly indexed or displayed to unapproved matches. Only high-level themes and approved resonance cards are displayed.
5. **Deterministic Re-ranking Formula:**
   $$\text{Score} = 0.55(\text{Semantic}) + 0.15(\text{ConvStyle}) + 0.15(\text{Complementary}) + 0.10(\text{Timezone}) + 0.05(\text{Freshness})$$
6. **Graceful Fallbacks:** The app must work smoothly in local demo/mock mode with pre-seeded rich profiles, while seamlessly connecting to Supabase and OpenAI when environment keys are provided.

---

## 📝 Instructions for Next Agent

1. Check this file (`AGENT_HANDOFF.md`) and [`ROADMAP.md`](file:///home/rajsinghast03/dev/mindmate/ROADMAP.md).
2. Continue executing the next unchecked item in the **Up Next** section.
3. Keep code modular, clean, and well-typed.
4. Update [`AGENT_HANDOFF.md`](file:///home/rajsinghast03/dev/mindmate/AGENT_HANDOFF.md) and [`ROADMAP.md`](file:///home/rajsinghast03/dev/mindmate/ROADMAP.md) upon completing tasks or reaching milestone boundaries.
