/**
 * Embedding generation for the maintenance scripts.
 *
 * Mirrors lib/matching/embeddings.ts. The app module can't be imported here — it's
 * TypeScript and these scripts run under plain `node` with no build step — so the
 * provider calls are intentionally duplicated. Keep the models, dimension and
 * normalisation behaviour in sync with that file.
 */

import { fetchWithRetry } from './http-retry.mjs';

export const EMBEDDING_DIMENSIONS = 1536;
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

function l2Normalize(vector) {
  let sumOfSquares = 0;
  for (const value of vector) sumOfSquares += value * value;

  const norm = Math.sqrt(sumOfSquares);
  if (!norm || !Number.isFinite(norm)) return vector;

  return vector.map(value => value / norm);
}

function assertUsable(values, provider) {
  if (!Array.isArray(values)) {
    throw new Error(`${provider} response contained no embedding values array.`);
  }
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `${provider} returned ${values.length} dimensions, expected ${EMBEDDING_DIMENSIONS}. ` +
        `profiles.profile_embedding is VECTOR(${EMBEDDING_DIMENSIONS}).`
    );
  }
  return l2Normalize(values);
}

async function embedWithGemini({ apiKey, model }, text) {
  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        content: { parts: [{ text: text.trim() }] },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    },
    'Gemini embedding'
  );

  if (!res.ok) {
    throw new Error(`Gemini embedding failed (HTTP ${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  // Singular `content` request returns `embedding.values`; the batch/plural form
  // returns `embeddings[0].values`. Accept either.
  return assertUsable(data?.embedding?.values ?? data?.embeddings?.[0]?.values, 'Gemini');
}

async function embedWithOpenAi({ apiKey }, text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input: text.trim() }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI embedding failed (HTTP ${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return assertUsable(data?.data?.[0]?.embedding, 'OpenAI');
}

/**
 * @param ai the `ai` object returned by requireServiceEnv()
 * Throws on failure — scripts should stop loudly rather than write null rows.
 */
export async function generateEmbedding(ai, text) {
  return ai.provider === 'gemini' ? embedWithGemini(ai, text) : embedWithOpenAi(ai, text);
}
