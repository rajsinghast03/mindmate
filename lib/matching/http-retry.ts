/**
 * Retry helper for AI provider calls.
 *
 * Free-tier capacity errors (503 "high demand", 429 rate limit) are common and
 * transient. Without a retry a single blip would make the synthesizer fall back to
 * the offline generator — and because resonance text is persisted and never
 * regenerated, that canned explanation would stick to the match forever.
 */

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

/**
 * Node's fetch has no default timeout, so an unresponsive model would hang the route
 * handler indefinitely — observed with an overloaded Gemini flagship model. Abort and
 * retry instead; a TimeoutError lands in the catch branch below.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Callers that chain providers need a tighter budget than the defaults. The
 * synthesizer gives Gemini two short attempts and keeps the remaining wall clock for
 * the next provider, rather than letting one spend the whole request on retries — see
 * synthesizeMatchResonance().
 */
export type RetryOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  options: RetryOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxAttempts = MAX_ATTEMPTS } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) {
        return res;
      }

      console.warn(`${label}: HTTP ${res.status}, retrying (${attempt}/${maxAttempts - 1})…`);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
      const reason = (error as Error)?.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : 'network error';
      console.warn(`${label}: ${reason}, retrying (${attempt}/${maxAttempts - 1})…`);
    }

    // No backoff after the last attempt — a caller with a provider chain to fall
    // through to should not pay for a sleep it will never use.
    if (attempt < maxAttempts) {
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError ?? new Error(`${label} failed after ${maxAttempts} attempts`);
}
