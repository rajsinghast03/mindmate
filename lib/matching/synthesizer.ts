import { Profile } from '@/types';
import { getGeminiChatModel, getGeminiKey, getOpenAiKey } from '@/lib/config';
import { fetchWithRetry } from '@/lib/matching/http-retry';

export type SynthesizedResonance = {
  explanation: string;
  sharedCuriosity: string;
  sharedQuestion: string;
};

// Fallback generator for realistic, high-quality editorial resonance
export function generateLocalResonance(userProfile: Profile, candidate: Profile): SynthesizedResonance {
  const profileTextA = userProfile.curiosityProfile.toLowerCase();
  const profileTextB = candidate.curiosityProfile.toLowerCase();

  // Determine shared domain or theme
  let sharedCuriosity = 'Deliberate Craft & Deep Conversations';
  let explanation = `You both return to making things thoughtfully, escaping superficial small talk, and noticing the quiet details in everyday life.`;
  let sharedQuestion = `What would you try exploring this year if you knew nobody would judge you for being a complete beginner?`;

  if (profileTextA.includes('sound') || profileTextB.includes('sound') || profileTextB.includes('music') || profileTextA.includes('listening')) {
    sharedCuriosity = 'Acoustic Observation & Sonic Memory';
    explanation = `You both find grounding in deep listening and the way sensory environments shape memory and mood.`;
    sharedQuestion = `What is a specific ambient sound or song that immediately anchors you to a place you miss?`;
  } else if (profileTextA.includes('city') || profileTextB.includes('city') || profileTextA.includes('walk') || profileTextB.includes('urban')) {
    sharedCuriosity = 'Urban Topography & Micro-Histories';
    explanation = `You both appreciate slow wanderings through neighborhoods and dissecting how physical spaces influence human connection.`;
    sharedQuestion = `What is your favorite kind of 'third place' that feels like an antidote to digital fatigue?`;
  } else if (profileTextA.includes('nature') || profileTextB.includes('fungal') || profileTextB.includes('climate') || profileTextA.includes('plants')) {
    sharedCuriosity = 'Ecological Systems & Grounded Living';
    explanation = `You share a passion for hands-on ecological curiosity and finding constructive optimism through natural systems.`;
    sharedQuestion = `What is a small, physical practice you do that helps you stay patient with slow processes?`;
  } else if (profileTextA.includes('game') || profileTextB.includes('game') || profileTextA.includes('system') || profileTextB.includes('play')) {
    sharedCuriosity = 'Complex Systems & Playful Design';
    explanation = `You both enjoy taking complex mental models apart and finding playfulness in structured constraints.`;
    sharedQuestion = `What is a simple rule or game mechanic from your favorite pastimes that you wish applied to daily life?`;
  } else if (profileTextA.includes('photo') || profileTextB.includes('photo') || profileTextA.includes('film') || profileTextB.includes('memory')) {
    sharedCuriosity = 'Material Archives & Impermanence';
    explanation = `You both value tangible artifacts over ephemeral digital feeds and care about preserving unhurried memories.`;
    sharedQuestion = `If you could curate a physical exhibition of only three personal objects, what would one of them be?`;
  } else if (profileTextA.includes('language') || profileTextB.includes('language') || profileTextA.includes('words') || profileTextB.includes('poetry')) {
    sharedCuriosity = 'Nuance in Language & Subtle Emotions';
    explanation = `You both ponder the boundaries of words and value emotional precision in everyday dialogue.`;
    sharedQuestion = `Is there a feeling or experience you’ve had recently that felt completely untranslatable into standard words?`;
  } else if (profileTextA.includes('space') || profileTextB.includes('star') || profileTextA.includes('astronomy') || profileTextB.includes('universe')) {
    sharedCuriosity = 'Cosmic Scale & Childlike Curiosity';
    explanation = `You both stay tuned to the quiet awe of the night sky and the joy of tinkering with things from first principles.`;
    sharedQuestion = `When was the last time a piece of new knowledge made you stop in your tracks from pure wonder?`;
  }

  return {
    explanation,
    sharedCuriosity,
    sharedQuestion,
  };
}

const OPENAI_CHAT_MODEL = 'gpt-4o-mini';

type RawResonance = {
  resonance_summary?: unknown;
  shared_curiosity?: unknown;
  first_question?: unknown;
};

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
 * Returning null makes the caller skip the candidate and retry it next round, which is
 * the right trade when the alternative is a permanent bad row.
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

async function synthesizeWithGemini(
  apiKey: string,
  prompt: string
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
    'Gemini resonance'
  );

  if (!res.ok) {
    console.warn(`Gemini resonance request failed (HTTP ${res.status}).`);
    return null;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') return null;

  return toResonance(JSON.parse(text));
}

async function synthesizeWithOpenAi(
  apiKey: string,
  prompt: string
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
    'OpenAI resonance'
  );

  if (!res.ok) {
    console.warn(`OpenAI resonance request failed (HTTP ${res.status}).`);
    return null;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return null;

  return toResonance(JSON.parse(content));
}

/**
 * Gemini first (free tier), OpenAI if that's the only key present.
 *
 * Returns null when a provider IS configured but the call ultimately failed. That
 * matters: resonance text is written once and never regenerated, so persisting the
 * offline template after a transient 503 would permanently saddle a real pair with a
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
  const geminiKey = getGeminiKey();
  const openAiKey = getOpenAiKey();

  if (!geminiKey && !openAiKey) {
    return generateLocalResonance(userProfile, candidate);
  }

  const prompt = buildPrompt(userProfile, candidate);

  try {
    return geminiKey
      ? await synthesizeWithGemini(geminiKey, prompt)
      : await synthesizeWithOpenAi(openAiKey as string, prompt);
  } catch (error) {
    console.error('Error generating resonance:', error);
    return null;
  }
}
