'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import { createClient } from '@/lib/supabase/client';
import {
  getOnboardingDraft,
  clearOnboardingDraft,
  type OnboardingDraft,
} from '@/lib/onboarding-draft';

async function resolveDraft(): Promise<OnboardingDraft | null> {
  const local = getOnboardingDraft();
  if (local?.curiosityProfile) return local;

  try {
    const res = await fetch('/api/onboarding-draft');
    if (res.ok) {
      const { draft } = await res.json();
      if (draft?.curiosityProfile) return draft as OnboardingDraft;
    }
  } catch {
    // fall through to metadata
  }

  const { data: { user } } = await createClient().auth.getUser();
  const meta = user?.user_metadata?.mindmate_draft as OnboardingDraft | undefined;
  return meta?.curiosityProfile ? meta : null;
}

export default function AuthCompletePage() {
  const router = useRouter();
  const { isLoaded, authUser, userProfile, saveProfile, isSupabaseMode } = useMindmate();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

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
        router.replace('/discover');
        return;
      }

      const draft = await resolveDraft();

      if (
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
          router.replace('/discover');
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
