/** Mirrors lib/matching/http-retry.ts for the plain-node scripts. */

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;
const DEFAULT_TIMEOUT_MS = 15_000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchWithRetry(url, init, label, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) return res;
      console.warn(`   ${label}: HTTP ${res.status}, retrying (${attempt}/${MAX_ATTEMPTS - 1})…`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
      const reason = error?.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : 'network error';
      console.warn(`   ${label}: ${reason}, retrying (${attempt}/${MAX_ATTEMPTS - 1})…`);
    }
    await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
  }

  throw lastError ?? new Error(`${label} failed after ${MAX_ATTEMPTS} attempts`);
}
