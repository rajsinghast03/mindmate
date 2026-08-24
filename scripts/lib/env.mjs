/** Shared .env.local loader for the maintenance scripts. */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env.local');

export function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found. Copy from .env.example first.');
    process.exit(1);
  }

  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

/**
 * Env for scripts that write as the service role: URL + secret key + OpenAI.
 * Exits with an explanation rather than failing deep inside a request.
 */
/** Mirrors realValue() in lib/config.ts — unfilled .env.example values count as unset. */
const PLACEHOLDER_PATTERN = /^(your[_-]|<|changeme|xxx)/i;

function realValue(value) {
  const trimmed = value?.trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed) || trimmed.endsWith('...')) return undefined;
  return trimmed;
}

/**
 * AI provider only — usable before any Supabase secret is configured, so the
 * provider can be verified independently.
 */
export function requireAiEnv() {
  const env = loadEnv();

  const geminiKey = realValue(env.GEMINI_API_KEY) || realValue(env.GOOGLE_API_KEY);
  const openaiKey = realValue(env.OPENAI_API_KEY);

  if (!geminiKey && !openaiKey) {
    console.error('❌ No AI provider key found — embeddings cannot be generated.');
    console.error('   Set GEMINI_API_KEY (free tier, no card: https://aistudio.google.com/apikey)');
    console.error('   or OPENAI_API_KEY in .env.local.');
    process.exit(1);
  }

  // Gemini wins when both are present, matching lib/matching/embeddings.ts.
  return geminiKey
    ? {
        provider: 'gemini',
        apiKey: geminiKey,
        model: realValue(env.GEMINI_EMBEDDING_MODEL) ?? 'gemini-embedding-001',
        // Keep in sync with getGeminiChatModel() in lib/config.ts.
        chatModel: realValue(env.GEMINI_CHAT_MODEL) ?? 'gemini-3.5-flash-lite',
      }
    : { provider: 'openai', apiKey: openaiKey, chatModel: 'gpt-4o-mini' };
}

/** Supabase service role + an AI provider, for the scripts that write to the database. */
export function requireServiceEnv() {
  const env = loadEnv();

  const url = realValue(env.NEXT_PUBLIC_SUPABASE_URL);
  // Current key name first; SUPABASE_SERVICE_ROLE_KEY is the legacy JWT name.
  const serviceKey =
    realValue(env.SUPABASE_SECRET_KEY) || realValue(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || url.includes('your-project')) {
    console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL in .env.local');
    process.exit(1);
  }

  if (!serviceKey) {
    console.error('❌ Set SUPABASE_SECRET_KEY in .env.local (it is still a placeholder).');
    console.error('   Dashboard → Settings → API Keys → Secret keys → sb_secret_...');
    console.error('   (The legacy SUPABASE_SERVICE_ROLE_KEY name still works as a fallback.)');
    process.exit(1);
  }

  return { url, serviceKey, ai: requireAiEnv() };
}
