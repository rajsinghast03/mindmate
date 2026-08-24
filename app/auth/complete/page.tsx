'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import {
  getOnboardingDraft,
  clearOnboardingDraft,
  safeNextPath,
  type OnboardingDraft,
} from '@/lib/onboarding-draft';

/**
 * Where a recovered draft came from.
 *
 * `local` means this browser wrote it, which is the only evidence we have that the
 * person signing in is the person who typed it. `server` is the cross-device path
 * (draft keyed by email), and anyone can write to that key for any address — so a
 * server draft is never trusted enough to save without the owner seeing it first.
 */
type ResolvedDraft = { draft: OnboardingDraft; source: 'local' | 'server' } | null;

async function resolveDraft(): Promise<ResolvedDraft> {
  const local = getOnboardingDraft();
  if (local?.curiosityProfile) return { draft: local, source: 'local' };

  try {
    const res = await fetch('/api/onboarding-draft');
    if (res.ok) {
      const { draft } = await res.json();
      if (draft?.curiosityProfile) return { draft: draft as OnboardingDraft, source: 'server' };
    }
  } catch {
    // No draft to recover; onboarding starts from scratch below.
  }

  return null;
}

export default function AuthCompletePage() {
  const router = useRouter();
  const { isLoaded, authUser, userProfile, saveProfile, isSupabaseMode } = useMindmate();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    // Read from window rather than useSearchParams(): this effect is already
    // client-only, and useSearchParams would force a Suspense refactor of the page.
    const destination = safeNextPath(
      new URLSearchParams(window.location.search).get('next'),
      '/discover'
    );

    (async () => {
      if (!isSupabaseMode) {
        router.replace('/');
        return;
      }

      if (!authUser) {
        router.replace('/auth/login');
        return;
      }

      if (userProfile) {
        router.replace(destination);
        return;
      }

      const resolved = await resolveDraft();
      const draft = resolved?.draft;

      // Auto-save only a draft this browser wrote. A server-recovered draft is
      // shown on the review screen for explicit approval instead, so a draft
      // planted against someone else's email can never silently become their profile.
      if (
        resolved?.source === 'local' &&
        draft?.curiosityProfile &&
        draft.displayName &&
        draft.age &&
        draft.cityOrTimezone
      ) {
        try {
          await saveProfile(
            draft.displayName,
            draft.age,
            draft.cityOrTimezone,
            draft.curiosityProfile,
            draft.ianaTimezone ?? null
          );
          clearOnboardingDraft();
          router.replace(destination);
          return;
        } catch {
          router.replace('/onboarding/review');
          return;
        }
      }

      if (draft?.curiosityProfile) {
        router.replace('/onboarding/review');
        return;
      }

      router.replace('/onboarding/paste');
    })();
  }, [isLoaded, authUser, userProfile, isSupabaseMode, saveProfile, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      <p className="font-serif text-sm text-ink-600">Signing you in…</p>
    </div>
  );
}
