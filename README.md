# 🧠 Mindmate

> **Meet people through the questions they can't stop asking.**  
> An intellectual, curiosity-first connection platform where matches are made through ideas, ongoing questions, and deep curiosities—not shallow bios, photos, or swipe feeds.

---

## 📖 Project Documentation & Context Hub

To maintain complete continuity across engineering sessions and agent context windows, the project is comprehensively documented across dedicated guides:

| Document | Description |
| :--- | :--- |
| 🤖 [**`AGENT_HANDOFF.md`**](file:///home/rajsinghast03/dev/mindmate/AGENT_HANDOFF.md) | **Start here for AI agents & developers.** Active session state, completed milestones, and immediate next steps. |
| 🗺️ [**`ROADMAP.md`**](file:///home/rajsinghast03/dev/mindmate/ROADMAP.md) | Granular phase breakdown, task checklists, and acceptance criteria. |
| 🏛️ [**`ARCHITECTURE.md`**](file:///home/rajsinghast03/dev/mindmate/ARCHITECTURE.md) | System design, hybrid AI matching engine pipeline, and privacy model. |
| 🗄️ [**`DATABASE_SCHEMA.md`**](file:///home/rajsinghast03/dev/mindmate/DATABASE_SCHEMA.md) | PostgreSQL / Supabase schema, `pgvector` indexing, and Row Level Security (RLS). |
| 🎨 [**`DESIGN_SYSTEM.md`**](file:///home/rajsinghast03/dev/mindmate/DESIGN_SYSTEM.md) | Editorial typography, warm paper color tokens, and UI component specifications. |
| 📄 [**`mindmate-build-brief.md`**](file:///home/rajsinghast03/dev/mindmate/mindmate-build-brief.md) | The original product build brief and requirements. |

---

## 🌟 Core Concept & Principles

1. **AI-Assisted, User-Controlled:** Users copy a privacy-safe prompt to generate a 90–130 word *Curiosity Profile* using ChatGPT or write their own.
2. **Zero History Scraping:** Mindmate never asks for ChatGPT OAuth access, passwords, or raw conversation logs. Users paste, review, edit, and approve their own text.
3. **No Swipe Mechanics:** No infinite feeds, hot-or-not swiping, or addictive gamification. Users receive 1–3 carefully curated introductions.
4. **Qualitative Resonance:** Replaces fake numbers ("94% match") with meaningful editorial explanations of *why* two minds connect.
5. **Consent-Gated Conversations:** Both individuals must opt in before a private chat unlocks, beginning with a thoughtful shared question.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS + Tailwind Typography
- **Database & Auth:** Supabase (PostgreSQL, Row-Level Security, Auth)
- **Vector Search:** `pgvector` with Cosine Distance (`<=>`) index
- **AI Intelligence:** OpenAI API (`text-embedding-3-small` embeddings + structured LLM synthesizer) or Google Gemini
- **Deployment:** Vercel

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open application
# http://localhost:3000
```
