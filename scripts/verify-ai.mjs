/**
 * Check the AI provider end to end before seeding anything.
 *
 * Verifies the things that actually break silently: that embeddings come back at
 * exactly the dimension the `profiles.profile_embedding` column expects, that the chat
 * model ID is still valid and honours the JSON response schema. Model IDs drift —
 * Google retires Flash models regularly — so a clear failure here beats a confusing
 * 503 from /api/match later.
 *
 * Run: npm run verify:ai
 */

import { requireAiEnv } from './lib/env.mjs';
import { generateEmbedding, EMBEDDING_DIMENSIONS } from './lib/embeddings.mjs';
import { fetchWithRetry } from './lib/http-retry.mjs';

const SAMPLE = `I keep returning to the tension between digital hyper-efficiency and tactile
human craft. I bind small notebooks by hand and wonder how personal computing lost its intimacy.
I want to build quiet, small software tools designed to last twenty years.`;

const ai = requireAiEnv();

console.log(`Provider: ${ai.provider}${ai.model ? ` (${ai.model})` : ''}\n`);

// ── 1. Embeddings ──────────────────────────────────────────────────────────────
let embeddingOk = false;
try {
  const started = Date.now();
  const vector = await generateEmbedding(ai, SAMPLE);
  const elapsed = Date.now() - started;

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  const isUnit = Math.abs(norm - 1) < 1e-6;

  console.log(`✅ Embedding: ${vector.length} dimensions in ${elapsed}ms`);
  console.log(`   L2 norm ${norm.toFixed(8)} ${isUnit ? '(unit vector ✓)' : '(NOT normalized ✗)'}`);

  if (vector.length !== EMBEDDING_DIMENSIONS) {
    console.error(
      `   ✗ Column profiles.profile_embedding is VECTOR(${EMBEDDING_DIMENSIONS}); inserts will fail.`
    );
  } else if (!isUnit) {
    console.error('   ✗ Expected a unit vector after normalization.');
  } else {
    embeddingOk = true;
  }
} catch (err) {
  console.error(`❌ Embedding failed: ${err.message}`);
}

// ── 2. Resonance synthesis ─────────────────────────────────────────────────────
// Mirrors lib/matching/synthesizer.ts. Kept minimal — this only proves the model ID
// resolves and structured JSON comes back, not the quality of the prompt.
// Mirrors the real prompt's constraints so the smoke test exercises the same limits
// toResonance() enforces — notably that shared_curiosity is a short theme, not a sentence.
const PROMPT = `Return a JSON object about why two people interested in craft and software
might connect. Keys: "resonance_summary" (one sentence addressed to the reader as "You both"),
"shared_curiosity" (a 2-4 word theme, under 60 characters), "first_question" (one open question).`;

/** Mirrors toResonance() in lib/matching/synthesizer.ts — including the caps that gate the card layout. */
const FIELD_CAPS = { shared_curiosity: 60, resonance_summary: 400, first_question: 300 };

function validateResonance(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('   ✗ Response was not valid JSON.');
    return false;
  }

  const missing = Object.keys(FIELD_CAPS).filter(
    k => typeof parsed[k] !== 'string' || !parsed[k].trim()
  );
  if (missing.length) {
    console.error(`   ✗ Response missing keys: ${missing.join(', ')}`);
    return false;
  }

  const tooLong = Object.entries(FIELD_CAPS).filter(([k, cap]) => parsed[k].trim().length > cap);
  if (tooLong.length) {
    for (const [k, cap] of tooLong) {
      console.error(`   ✗ ${k} is ${parsed[k].trim().length} chars, over the ${cap} cap — the card would discard this.`);
    }
    return false;
  }

  console.log(`   Sample shared_curiosity: "${parsed.shared_curiosity}"`);
  return true;
}

let chatOk = false;
try {
  const started = Date.now();
  let text;

  if (ai.provider === 'gemini') {
    const model = ai.chatModel;
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }] }],
          generationConfig: {
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
      'Gemini chat'
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `HTTP ${res.status} for model "${model}". ${
          res.status === 404
            ? 'That model ID may have been retired — set GEMINI_CHAT_MODEL to a current one.'
            : res.status === 503
              ? 'The model is valid but at capacity right now (this retried 3 times). Try again shortly.'
              : body.slice(0, 200)
        }`
      );
    }

    const data = await res.json();
    text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`\n✅ Chat model "${model}" responded in ${Date.now() - started}ms`);
  } else {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: PROMPT }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    text = data?.choices?.[0]?.message?.content;
    console.log(`\n✅ Chat model "gpt-4o-mini" responded in ${Date.now() - started}ms`);
  }

  chatOk = validateResonance(text);
} catch (err) {
  console.error(`\n❌ Chat model failed: ${err.message}`);
}

console.log('');
if (embeddingOk && chatOk) {
  console.log('✅ Provider is ready. Next: npm run seed:demo');
  process.exit(0);
}

console.error('❌ Fix the above before running npm run seed:demo.');
process.exit(1);
