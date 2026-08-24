/**
 * Values copied from .env.example but never filled in ("your_openai_api_key_here",
 * "sb_secret_...") are treated as absent. Otherwise they get sent as real
 * credentials and come back as opaque "Invalid API key" errors.
 */
const PLACEHOLDER_PATTERN = /^(your[_-]|sb_secret\.{3}|sb_secret_\.\.\.|<|changeme|xxx)/i;

function realValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (PLACEHOLDER_PATTERN.test(trimmed)) return undefined;
  if (trimmed.endsWith('...')) return undefined;
  return trimmed;
}

/** Supabase project URL from env. */
export function getSupabaseUrl(): string | undefined {
  const url = realValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return url && !url.includes('your-project') ? url : undefined;
}

/** Client-side key — publishable (new) or anon (legacy). */
export function getSupabasePublishableKey(): string | undefined {
  return (
    realValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    realValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Secret key for RLS-bypassing server work: candidate retrieval, match inserts,
 * and status transitions. Server-only — never expose this to the browser.
 *
 * Prefers the current `sb_secret_...` key. `SUPABASE_SERVICE_ROLE_KEY` is the legacy
 * JWT-based name, kept as a fallback — Supabase is retiring anon/service_role keys by
 * the end of 2026. Secret keys are also safer: they 401 when sent from a browser, and
 * you can issue one per service so a leak forces a single rotation.
 */
export function getSupabaseServiceKey(): string | undefined {
  return (
    realValue(process.env.SUPABASE_SECRET_KEY) ||
    realValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/**
 * Google AI Studio key — the default provider for embeddings and resonance
 * synthesis, because both models this app needs sit on Gemini's free tier.
 */
export function getGeminiKey(): string | undefined {
  return realValue(process.env.GEMINI_API_KEY) || realValue(process.env.GOOGLE_API_KEY);
}

/** Optional paid alternative. Used only when no Gemini key is present. */
export function getOpenAiKey(): string | undefined {
  return realValue(process.env.OPENAI_API_KEY);
}

/**
 * Model IDs are env-overridable because Google retires and renames Flash models
 * faster than this repo will be updated. Defaults track the current stable line.
 */
export function getGeminiEmbeddingModel(): string {
  return realValue(process.env.GEMINI_EMBEDDING_MODEL) ?? 'gemini-embedding-001';
}

/**
 * flash-lite rather than the flagship flash: measured against the real synthesizer
 * prompt it returned in ~1.5s versus ~6.6s, and kept the second-person voice the
 * match card needs. The current flagship (gemini-3.7-flash) was timing out entirely
 * on the free tier when this was chosen.
 */
export function getGeminiChatModel(): string {
  return realValue(process.env.GEMINI_CHAT_MODEL) ?? 'gemini-3.5-flash-lite';
}

/** True when either AI provider is usable — matching needs one of them. */
export function isAiConfigured(): boolean {
  return Boolean(getGeminiKey() || getOpenAiKey());
}

/** True when Supabase env vars are set — enables cloud auth + profile persistence. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

/** True when the server can act across users (matching, transitions, messaging). */
export function isServiceRoleConfigured(): boolean {
  return Boolean(getSupabaseServiceKey());
}
