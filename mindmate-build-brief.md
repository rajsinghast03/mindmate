# Mindmate — MVP Build Brief

## Product in one sentence

Mindmate helps people meet through the questions, ideas, and curiosities that occupy their mind—not through a shallow bio, job title, or swipe feed.

**Tagline:** *Meet people through the questions they can’t stop asking.*

## The core experience

1. A visitor opens the Mindmate site.
2. They copy a privacy-safe prompt and use it in ChatGPT (or write their own answer).
3. They paste the resulting **Curiosity Profile** into Mindmate.
4. They review it and add only a display name, age, and broad city/timezone.
5. Mindmate shows a small number of unusually relevant people and explains why each match exists.
6. Both people must opt in before a private conversation opens.
7. The chat begins with a thoughtful shared question. No forced labels: it might become friendship, love, a hobby, or collaboration naturally.

## Product principles

- Do not ask users to choose “dating,” “work,” “friendship,” or “hobby” at onboarding.
- Do not make users fill out a long questionnaire.
- Do not use swiping or an infinite people feed.
- Do not read a user’s ChatGPT account or raw history.
- Users paste only a profile they can read, edit, approve, and delete.
- Never infer romantic intent. A connection begins as a shared conversation after both people opt in.
- Favour a few strong introductions over many weak ones.
- Be especially thoughtful about privacy, consent, block/report tools, and visibility of location/contact details.

## Curiosity Profile prompt

This prompt should be copyable from the product:

```text
Create a short, privacy-safe Curiosity Profile I can use to meet like-minded people. Use only information I explicitly choose to share. Do not include names, employer, exact location, health, money, relationship history, or other identifying details.

Write in first person, 90–130 words. Include: what I keep thinking about, what I want to explore or make, the kind of conversations or experiences I enjoy, and what I hope to find in other people. Make it warm, specific, and human—not like a résumé.
```

## MVP pages and states

### 1. Landing page

- Headline: **Meet people through the questions they can’t stop asking.**
- CTA: **Find someone who gets you**
- Explain the privacy model simply: “We never access your ChatGPT account or chat history.”
- Include the 3-step explanation: ask AI → paste/edit/approve → meet a mind.

### 2. Paste profile

- Large text area for the Curiosity Profile.
- “Copy prompt” button.
- CTA: **Find my person**.
- Validate a sensible minimum/maximum length.

### 3. Profile review

- Display name (first name or nickname)
- Age (18+)
- City or timezone only; no precise address
- Editable Curiosity Profile preview
- CTA: **Show me my Mindmates**
- Explicit statement that raw pasted text is not shown to others before mutual connection.

### 4. Match cards

- Show 1–3 candidates rather than a feed.
- Each card includes: avatar/photo, display name, age, broad city, one-sentence resonance summary, a shared curiosity, and one suggested first question.
- CTA: **I’d like to connect** and **Not for me**.
- Do not show a fake numeric compatibility score in production. Human reasons are more trustworthy than “92%.”

Example reason:

> You both return to making things, escaping shallow conversations, and finding small adventures in ordinary days.

Example first question:

> What would you try this year if you knew nobody would judge you for being a beginner?

### 5. Mutual connection and chat

- “Connect” is a request, not an immediate chat.
- When both people accept, open a private conversation with the shared first question.
- Provide block/report controls and a way to unmatch.
- Contact details and precise location are never required and are only shared voluntarily in chat.

## Suggested data model

```ts
type User = {
  id: string;
  email: string;
  createdAt: Date;
};

type Profile = {
  id: string;
  userId: string;
  displayName: string;
  age: number;
  cityOrTimezone: string;
  curiosityProfile: string;
  profileEmbedding: number[] | null;
  visibility: 'discoverable' | 'paused';
  createdAt: Date;
  updatedAt: Date;
};

type Match = {
  id: string;
  profileAId: string;
  profileBId: string;
  score: number;
  explanation: string;
  sharedQuestion: string;
  status: 'suggested' | 'requested' | 'connected' | 'passed' | 'unmatched';
  requestedByProfileId: string | null;
  createdAt: Date;
};

type Conversation = {
  id: string;
  matchId: string;
  createdAt: Date;
};

type Message = {
  id: string;
  conversationId: string;
  senderProfileId: string;
  body: string;
  createdAt: Date;
};
```

## Matching: MVP implementation

Use a hybrid model. Do not rely on simple keyword matching or vector similarity alone.

1. Generate an embedding for each approved Curiosity Profile.
2. Use vector similarity to retrieve a candidate pool (e.g. top 50–100 profiles).
3. Apply hard filters:
   - age/eligibility rules
   - both profiles are discoverable
   - do not show already passed, blocked, or matched people
   - optionally prefer compatible timezones / distance
4. Re-rank candidates using a mixture of:

```text
0.55 × semantic curiosity similarity
0.15 × conversation-style similarity
0.15 × complementary interests / “could do something together” signal
0.10 × timezone or location practicality
0.05 × freshness and diversity
```

5. Use an LLM only on a small shortlisted candidate set to generate:
   - a short, safe match explanation
   - one specific first-conversation question
6. Store the result. Do not generate the explanation on every page render.

Important: match explanations must not reveal private inferred information. They should cite only high-level shared themes present in the user-approved profiles.

## Technical recommendation

For a fast web MVP:

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Authentication / database:** Supabase (Auth + Postgres)
- **Vector search:** pgvector in Supabase
- **AI:** OpenAI embeddings for retrieval; a small, structured LLM call for match explanations and starter questions
- **Hosting:** Vercel

The current repository contains a static design prototype. Preserve the calm editorial visual direction: warm paper background, dark ink text, coral accent, serif display type, and no dating-app visual clichés.

## Build phases

### Phase 1 — Working prototype

- Convert static site to a real application.
- Implement profile creation and preview.
- Add authentication and database storage.
- Use seeded fake profiles to demonstrate match cards.

### Phase 2 — Real discovery

- Generate profile embeddings after save.
- Implement candidate retrieval and re-ranking.
- Generate safe match explanations and starter questions.
- Add pass/connect state.

### Phase 3 — Mutual connection

- Implement connection requests.
- Open chat only after mutual acceptance.
- Add unmatch, block, and report.
- Build profile deletion / account deletion.

## Acceptance criteria for the first usable MVP

- A new user can sign in, paste a profile, edit it, and save it.
- A user sees up to three relevant candidate profiles.
- Each candidate has a clear, non-creepy reason for the match.
- A user can pass or send a connection request.
- No one can message another user without mutual acceptance.
- A user can pause discovery, delete their profile, block, and report.
- The experience works on mobile.

## Out of scope for MVP

- Native mobile applications
- Full ChatGPT history import or OAuth access to ChatGPT
- Infinite swipe feed
- Exact distance tracking
- Forced intent labels (love/work/hobby)
- Paid subscriptions, social feed, events, or groups

