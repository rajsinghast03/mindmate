'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import {
  getOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  safeNextPath,
  type OnboardingDraft,
} from '@/lib/onboarding-draft';

/**
 * Where a recovered draft came from.
 *
 * `local` means this browser wrote it, which is the only evidence we have that the
 * person signing in is the person who typed it. `server` is the cross-device path:
 * the draft was stashed under a random token that travelled inside the confirmation
 * email, so only the verified recipient can redeem it. That is a far narrower door
 * than the old email key, but it is still not this browser — a server draft goes to
 * the review screen for a look rather than being saved silently.
 */
type ResolvedDraft = { draft: OnboardingDraft; source: 'local' | 'server' } | null;

async function resolveDraft(token: string | null): Promise<ResolvedDraft> {
  const local = getOnboardingDraft();
  if (local?.curiosityProfile) return { draft: local, source: 'local' };

  if (!token) return null;

  try {
    const res = await fetch(`/api/onboarding-draft?token=${encodeURIComponent(token)}`);
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
    const params = new URLSearchParams(window.location.search);
    const destination = safeNextPath(params.get('next'), '/discover');
    // Set by the signup flow; the confirmation email carries it back here.
    const draftToken = params.get('draft');

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

      const resolved = await resolveDraft(draftToken);
      const draft = resolved?.draft;

      // Auto-save only a draft this browser wrote. A token-recovered draft is
      // shown on the review screen for explicit approval instead, so nothing that
      // arrived from outside this browser silently becomes someone's profile.
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
        // The review screen prefills from localStorage, so a draft redeemed from
        // the server has to be written there first — otherwise it is read, deleted,
        // and then dropped on the floor, and review bounces to /onboarding/paste
        // with the text gone. That was the cross-device path's real failure mode.
        if (resolved?.source === 'server') saveOnboardingDraft(draft);
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
