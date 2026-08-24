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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
        return res;
      }

      console.warn(`${label}: HTTP ${res.status}, retrying (${attempt}/${MAX_ATTEMPTS - 1})…`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
      const reason = (error as Error)?.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : 'network error';
      console.warn(`${label}: ${reason}, retrying (${attempt}/${MAX_ATTEMPTS - 1})…`);
    }

    await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
  }

  throw lastError ?? new Error(`${label} failed after ${MAX_ATTEMPTS} attempts`);
}
