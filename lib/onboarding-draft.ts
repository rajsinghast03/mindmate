export type OnboardingDraft = {
  curiosityProfile: string;
  displayName?: string;
  age?: number;
  cityOrTimezone?: string;
  ianaTimezone?: string | null;
  /** Raw country/state/city selection used to prefill the cascading dropdowns. */
  countryCode?: string;
  state?: string | null;
  city?: string | null;
};

const DRAFT_KEY = 'mindmate_onboarding_draft';

/** Persist onboarding draft across tabs (survives magic-link email opens). */
export function getOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as OnboardingDraft;

    // Migrate legacy sessionStorage draft if present
    const legacyProfile = sessionStorage.getItem('temp_curiosity_profile');
    if (legacyProfile) {
      const draft: OnboardingDraft = { curiosityProfile: legacyProfile };
      const legacyDetails = sessionStorage.getItem('temp_profile_details');
      if (legacyDetails) {
        try {
          Object.assign(draft, JSON.parse(legacyDetails));
        } catch {
          // ignore
        }
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      return draft;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveOnboardingDraft(partial: Partial<OnboardingDraft>) {
  if (typeof window === 'undefined') return;
  const existing = getOnboardingDraft() ?? { curiosityProfile: '' };
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...partial }));
}

export function clearOnboardingDraft() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRAFT_KEY);
  sessionStorage.removeItem('temp_curiosity_profile');
  sessionStorage.removeItem('temp_profile_details');
}

/**
 * Validate a redirect target that came from a URL query param or cookie.
 *
 * Only same-origin absolute paths are allowed: it must start with a single "/".
 * A protocol-relative value like "//evil.com" is a fully-qualified URL to a
 * browser, so rejecting it is what stops this being an open redirect.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export function setAuthNextCookie(path: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `mindmate_auth_next=${encodeURIComponent(path)}; path=/; max-age=3600; SameSite=Lax`;
}

export function clearAuthNextCookie() {
  if (typeof window === 'undefined') return;
  document.cookie = 'mindmate_auth_next=; path=/; max-age=0; SameSite=Lax';
}
