/**
 * Curiosity Profile embeddings for pgvector retrieval.
 *
 * Gemini is the default provider: gemini-embedding-001 is on Google's free tier and
 * supports Matryoshka output dimensions, so it emits vectors at exactly 1536 to match
 * profiles.profile_embedding without a schema change. OpenAI remains supported as a
 * paid alternative and is used only when no Gemini key is configured.
 *
 * Raw fetch rather than either vendor SDK: no AI provider dependency is needed to
 * speak these two REST APIs. Embeddings are deliberately single-provider per
 * deployment: vectors from different models live in different vector spaces, so
 * failing over mid-flight would write a vector that cosine distance silently
 * mis-ranks against every other row.
 */

import {
  getGeminiEmbeddingModel,
  getGeminiKey,
  getOpenAiKey,
} from '@/lib/config';
import { fetchWithRetry } from '@/lib/matching/http-retry';

export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

/** Must stay in sync with profiles.profile_embedding VECTOR(1536). */
export const EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingProvider = 'gemini' | 'openai';

export function getEmbeddingProvider(): EmbeddingProvider | null {
  if (getGeminiKey()) return 'gemini';
  if (getOpenAiKey()) return 'openai';
  return null;
}

/**
 * Gemini only pre-normalises its full 3072-dimension output; Google's guidance is to
 * normalise manually at any smaller dimension. Cosine distance (`<=>`) divides by
 * magnitude anyway, so ordering is unaffected either way — but storing unit vectors
 * keeps the column consistent and safe if anyone later switches to `<->` or `<#>`,
 * where magnitude does change the result.
 */
function l2Normalize(vector: number[]): number[] {
  let sumOfSquares = 0;
  for (const value of vector) sumOfSquares += value * value;

  const norm = Math.sqrt(sumOfSquares);
  if (!norm || !Number.isFinite(norm)) return vector;

  return vector.map(value => value / norm);
}

function isUsableVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === EMBEDDING_DIMENSIONS;
}

/**
 * `:embedContent` with a singular `content` returns `{ embedding: { values } }`;
 * the batch form and newer plural `contents` request return `{ embeddings: [...] }`.
 * Accept both so this keeps working if the request shape ever changes.
 */
function readGeminiVector(data: unknown): unknown {
  const payload = data as {
    embedding?: { values?: unknown };
    embeddings?: Array<{ values?: unknown }>;
  };
  return payload?.embedding?.values ?? payload?.embeddings?.[0]?.values;
}

async function embedWithGemini(apiKey: string, input: string): Promise<number[] | null> {
  const model = getGeminiEmbeddingModel();

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        content: { parts: [{ text: input }] },
        // Both sides of a comparison are profiles of the same kind, so the symmetric
        // task type is the right one — not the retrieval query/document pair.
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    },
    'Gemini embedding'
  );

  if (!res.ok) {
    console.warn(`Gemini embedding failed (HTTP ${res.status}); storing null.`);
    return null;
  }

  const data = await res.json();
  const values = readGeminiVector(data);

  if (!isUsableVector(values)) {
    console.warn(
      `Gemini embedding unusable (expected ${EMBEDDING_DIMENSIONS} dimensions, got ` +
        `${Array.isArray(values) ? `${values.length}` : 'no values array'}); storing null.`
    );
    return null;
  }

  return l2Normalize(values);
}

async function embedWithOpenAi(apiKey: string, input: string): Promise<number[] | null> {
  const res = await fetchWithRetry(
    'https://api.openai.com/v1/embeddings',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input }),
    },
    'OpenAI embedding'
  );

  if (!res.ok) {
    console.warn(`OpenAI embedding failed (HTTP ${res.status}); storing null.`);
    return null;
  }

  const data = await res.json();
  const values = data?.data?.[0]?.embedding;

  if (!isUsableVector(values)) {
    console.warn('OpenAI embedding response had an unexpected shape; storing null.');
    return null;
  }

  // text-embedding-3-* already returns unit vectors; normalising is a no-op that
  // keeps both providers producing identically-scaled output.
  return l2Normalize(values);
}

/**
 * Returns a 1536-dimension unit vector, or null if embeddings are unavailable.
 *
 * Never throws: a profile save must succeed even when the provider is down or
 * unconfigured. Rows left with a null embedding are picked up by
 * scripts/backfill-embeddings.mjs and simply don't appear as candidates until then.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const input = text.trim();
  if (!input) return null;

  try {
    const geminiKey = getGeminiKey();
    if (geminiKey) return await embedWithGemini(geminiKey, input);

    const openAiKey = getOpenAiKey();
    if (openAiKey) return await embedWithOpenAi(openAiKey, input);

    return null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}
