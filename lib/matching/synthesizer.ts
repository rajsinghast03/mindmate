import { Profile } from '@/types';
import { SynthesizedResonance, generateLocalResonance } from '@/lib/matching/local-resonance';
import { getGeminiChatModel, getGeminiKey, getOpenAiKey } from '@/lib/config';
import { RetryOptions, fetchWithRetry } from '@/lib/matching/http-retry';

export type { SynthesizedResonance };

const OPENAI_CHAT_MODEL = 'gpt-4o-mini';

/**
 * Wall-clock ceiling for one card's synthesis, across every provider tried.
 *
 * Sized against `export const maxDuration` in app/api/match/route.ts. Without a
 * deadline the chain is theoretical: a single provider on three 15s retries already
 * outlives the platform's function timeout, so the fallback would never get to run.
 */
const TOTAL_BUDGET_MS = 45_000;

/** Below this there is not enough time left for a provider to be worth starting. */
const MIN_VIABLE_MS = 2_000;

type Budget = Required<RetryOptions>;

/**
 * Each provider gets a slice of TOTAL_BUDGET_MS rather than the whole thing: two
 * short Gemini attempts (~16.6s worst case with backoff) have to leave the next
 * provider in the chain enough time to be worth starting.
 */
function budgetFor(remainingMs: number, attemptMs: number, maxAttempts: number): Budget {
  return {
    timeoutMs: Math.min(attemptMs, remainingMs),
    // Not enough budget for the full set? Take one attempt and leave the rest of the
    // chain something to work with.
    maxAttempts: remainingMs >= attemptMs * maxAttempts ? maxAttempts : 1,
  };
}

type RawResonance = {
  resonance_summary?: unknown;
  shared_curiosity?: unknown;
  first_question?: unknown;
};

/**
 * The prompt of record, used verbatim by every provider.
 *
 * Deliberately one user turn with no separate system instruction, even though Claude
 * would take one: a fallback card is persisted alongside primary-provider cards and
 * read by the same people, so the two must be shaped by identical instructions. One
 * prompt in one place is how that stays true.
 */
function buildPrompt(userProfile: Profile, candidate: Profile): string {
  return `You are the thoughtful match synthesizer for Mindmate, an intellectual connection platform.
Analyze these two approved Curiosity Profiles:

Profile 1:
"${userProfile.curiosityProfile}"

Profile 2:
"${candidate.curiosityProfile}"

Generate a JSON response with:
1. "resonance_summary": One warm, human, non-creepy sentence explaining the authentic intellectual/philosophical overlap. Address the reader directly in the second person, beginning with "You both" or "You share" (e.g. "You both return to making things, escaping shallow conversations, and finding small adventures in ordinary days."). Never write about them in the third person. Do NOT include names, locations, or fake percentages.
2. "shared_curiosity": A concise 2-4 word theme representing their shared intellectual thread (e.g. "Tactile Design & Slow Living").
3. "first_question": A thoughtful, open-ended question that bridges both profiles and serves as a natural icebreaker conversation starter.

Respond in pure valid JSON:
{
  "resonance_summary": "...",
  "shared_curiosity": "...",
  "first_question": "..."
}`;
}

/**
 * Upper bounds matched to where each field is rendered. `sharedCuriosity` is a small
 * pill badge on the match card — a model that ignores the "2-4 word theme" instruction
 * and returns a sentence would wreck that layout, and the text is persisted forever.
 */
const MAX_SHARED_CURIOSITY = 60;
const MAX_EXPLANATION = 400;
const MAX_QUESTION = 300;

/**
 * Reject partial or malformed responses so a broken card never reaches the database.
 * Returning null makes the caller try the next provider, and — if none succeed — skip
 * the candidate, which is the right trade when the alternative is a permanent bad row.
 */
function toResonance(parsed: RawResonance): SynthesizedResonance | null {
  const { resonance_summary, shared_curiosity, first_question } = parsed;

  if (
    typeof resonance_summary !== 'string' ||
    typeof shared_curiosity !== 'string' ||
    typeof first_question !== 'string'
  ) {
    return null;
  }

  const explanation = resonance_summary.trim();
  const sharedCuriosity = shared_curiosity.trim();
  const sharedQuestion = first_question.trim();

  if (!explanation || !sharedCuriosity || !sharedQuestion) return null;

  if (
    sharedCuriosity.length > MAX_SHARED_CURIOSITY ||
    explanation.length > MAX_EXPLANATION ||
    sharedQuestion.length > MAX_QUESTION
  ) {
    console.warn(
      `Discarding resonance: field exceeded its limit (theme ${sharedCuriosity.length}/${MAX_SHARED_CURIOSITY}, ` +
        `summary ${explanation.length}/${MAX_EXPLANATION}, question ${sharedQuestion.length}/${MAX_QUESTION}).`
    );
    return null;
  }

  return { explanation, sharedCuriosity, sharedQuestion };
}

/** A malformed body must not throw past the provider that produced it — the next one may succeed. */
function parseResonance(raw: string, label: string): SynthesizedResonance | null {
  try {
    return toResonance(JSON.parse(raw));
  } catch {
    console.warn(`${label}: response was not valid JSON; discarding.`);
    return null;
  }
}

/**
 * Log what the provider actually said. With a chain of providers a bare status code
 * is not diagnosable — a 400 from a retired model ID and a 400 from a rejected
 * parameter look identical until you read the body.
 */
async function warnRequestFailed(res: Response, label: string): Promise<void> {
  let detail = '';
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    // Body already consumed or unreadable; the status is still worth logging.
  }
  console.warn(`${label} request failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`);
}

async function synthesizeWithGemini(
  apiKey: string,
  prompt: string,
  budget: Budget
): Promise<SynthesizedResonance | null> {
  const model = getGeminiChatModel();

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          // responseSchema is ignored unless the MIME type is set alongside it.
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              resonance_summary: { type: 'STRING' },
              shared_curiosity: { type: 'STRING' },
              first_question: { type: 'STRING' },
            },
            required: ['resonance_summary', 'shared_curiosity', 'first_question'],
          },
        },
      }),
    },
    'Gemini resonance',
    budget
  );

  if (!res.ok) {
    await warnRequestFailed(res, 'Gemini resonance');
    return null;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') return null;

  return parseResonance(text, 'Gemini resonance');
}

async function synthesizeWithOpenAi(
  apiKey: string,
  prompt: string,
  budget: Budget
): Promise<SynthesizedResonance | null> {
  const res = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    },
    'OpenAI resonance',
    budget
  );

  if (!res.ok) {
    await warnRequestFailed(res, 'OpenAI resonance');
    return null;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return null;

  return parseResonance(content, 'OpenAI resonance');
}

type SynthProvider = {
  name: string;
  attemptMs: number;
  maxAttempts: number;
  run: (prompt: string, budget: Budget) => Promise<SynthesizedResonance | null>;
};

/**
 * Gemini first because it is free, so steady-state cost stays at zero; OpenAI is the
 * paid fallback and never primary.
 */
function configuredProviders(): SynthProvider[] {
  const providers: SynthProvider[] = [];

  const geminiKey = getGeminiKey();
  if (geminiKey) {
    providers.push({
      name: 'Gemini',
      attemptMs: 8_000,
      maxAttempts: 2,
      run: (prompt, budget) => synthesizeWithGemini(geminiKey, prompt, budget),
    });
  }

  const openAiKey = getOpenAiKey();
  if (openAiKey) {
    providers.push({
      name: 'OpenAI',
      attemptMs: 12_000,
      maxAttempts: 2,
      run: (prompt, budget) => synthesizeWithOpenAi(openAiKey, prompt, budget),
    });
  }

  return providers;
}

/**
 * Try each configured provider in turn until one returns a usable card.
 *
 * Returns null when providers ARE configured but all of them failed. That matters:
 * resonance text is written once and never regenerated, so persisting the offline
 * template after a transient outage would permanently saddle a real pair with a
 * generic explanation. The caller skips those candidates instead — they come back
 * around on the next /api/match call.
 *
 * With no provider configured at all (local demo mode) the offline generator is the
 * intended result, not a failure.
 */
export async function synthesizeMatchResonance(
  userProfile: Profile,
  candidate: Profile
): Promise<SynthesizedResonance | null> {
  const providers = configuredProviders();
  if (!providers.length) {
    return generateLocalResonance(userProfile, candidate);
  }

  const prompt = buildPrompt(userProfile, candidate);
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (const provider of providers) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_VIABLE_MS) {
      console.warn(`Resonance budget spent before ${provider.name} could be tried.`);
      break;
    }

    try {
      const resonance = await provider.run(
        prompt,
        budgetFor(remaining, provider.attemptMs, provider.maxAttempts)
      );

      if (resonance) {
        // The only way to tell in production whether the fallback ever fires.
        console.info(`Resonance synthesised by ${provider.name}.`);
        return resonance;
      }

      console.warn(`${provider.name} returned no usable resonance; trying the next provider.`);
    } catch (error) {
      // Caught per provider, not around the whole chain: one provider throwing must
      // not cost the card a try at the next one.
      console.error(`${provider.name} resonance threw:`, error);
    }
  }

  return null;
}
