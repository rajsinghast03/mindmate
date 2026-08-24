'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import { LocationSelector } from '@/components/location-selector';
import {
  DEFAULT_COUNTRY_CODE,
  locationFromStored,
  resolveLocationSelection,
  type LocationSelection,
} from '@/data/world-cities';
import { ArrowLeft, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  getOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
} from '@/lib/onboarding-draft';

export default function ProfileReviewPage() {
  const router = useRouter();
  const { userProfile, saveProfile, authUser, isSupabaseMode, isLoaded } = useMindmate();

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<number | string>(28);
  const [location, setLocation] = useState<LocationSelection | null>(
    resolveLocationSelection(DEFAULT_COUNTRY_CODE, null)
  );
  const [curiosityText, setCuriosityText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setAge(userProfile.age);
      setLocation(locationFromStored(userProfile.cityOrTimezone, userProfile.ianaTimezone));
      setCuriosityText(userProfile.curiosityProfile);
      return;
    }

    // Wait for auth session before deciding there's no draft (magic-link opens new context)
    if (!isLoaded) return;

    const draft = getOnboardingDraft();
    if (draft?.curiosityProfile) {
      setCuriosityText(draft.curiosityProfile);
      if (draft.displayName) setDisplayName(draft.displayName);
      if (draft.age) setAge(draft.age);
      if (draft.countryCode) {
        setLocation(resolveLocationSelection(draft.countryCode, draft.city ?? null));
      } else if (draft.cityOrTimezone) {
        setLocation(locationFromStored(draft.cityOrTimezone, draft.ianaTimezone));
      }
      return;
    }

    // Authenticated but no local draft — metadata may still have it; /auth/complete handles that
    if (isSupabaseMode && authUser) return;

    router.replace('/onboarding/paste');
  }, [userProfile, isLoaded, isSupabaseMode, authUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter a display name or nickname.');
      return;
    }

    if (!location) {
      setError('Please select your country.');
      return;
    }

    const numericAge = Number(age);
    if (!numericAge || numericAge < 18 || numericAge > 120) {
      setError('Mindmate is for adults aged 18 and older.');
      return;
    }

    if (!curiosityText.trim() || curiosityText.trim().length < 40) {
      setError('Please ensure your Curiosity Profile is filled out.');
      return;
    }

    if (isSupabaseMode && !authUser) {
      saveOnboardingDraft({
        curiosityProfile: curiosityText.trim(),
        displayName: displayName.trim(),
        age: numericAge,
        cityOrTimezone: location.label,
        ianaTimezone: location.ianaTimezone,
        countryCode: location.countryCode,
        city: location.city,
      });
      router.push('/auth/login?next=/auth/complete');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await saveProfile(
        displayName.trim(),
        numericAge,
        location.label,
        curiosityText.trim(),
        location.ianaTimezone
      );
      clearOnboardingDraft();
      router.push('/discover');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Back button */}
      <Link
        href="/onboarding/paste"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-950 mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to edit text</span>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-paper-200 px-3 py-1 text-xs font-semibold text-ink-700 mb-3">
          <span>Step 2 of 2</span>
          <span>•</span>
          <span>Review & Details</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink-950">
          Almost ready to discover
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600">
          Review your profile and add a few basic details. We don&apos;t ask for phone numbers, social media handles, or photos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Box */}
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card space-y-5">
          <h2 className="font-serif text-lg font-medium text-ink-950 border-b border-paper-200 pb-3">
            Basic Identification
          </h2>

          {/* Display Name & Age Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="display-name"
                className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 mb-1.5"
              >
                Display Name or Nickname
              </label>
              <input
                id="display-name"
                type="text"
                required
                value={displayName}
                onChange={e => {
                  setDisplayName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Kabir, Ananya, Aarav, Meera"
                className="w-full rounded-xl border border-paper-300 bg-paper-100/60 px-4 py-3 text-base text-ink-950 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-all"
              />
              <p className="mt-1 text-xs text-ink-500">
                Only your first name or nickname is shown.
              </p>
            </div>

            <div>
              <label
                htmlFor="age-input"
                className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 mb-1.5"
              >
                Age (18+)
              </label>
              <input
                id="age-input"
                type="number"
                min={18}
                max={120}
                required
                value={age}
                onChange={e => {
                  setAge(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full rounded-xl border border-paper-300 bg-paper-100/60 px-4 py-3 text-base text-ink-950 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-all"
              />
            </div>
          </div>

          {/* Location Selector */}
          <div>
            <LocationSelector value={location} onChange={setLocation} />
          </div>
        </div>

        {/* Editable Curiosity Profile Preview */}
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-paper-200 pb-3">
            <h2 className="font-serif text-lg font-medium text-ink-950">
              Curiosity Profile Preview
            </h2>
            <span className="text-xs text-ink-500 font-mono">Editable</span>
          </div>

          <textarea
            rows={5}
            value={curiosityText}
            onChange={e => setCuriosityText(e.target.value)}
            className="w-full rounded-xl border border-paper-200 bg-paper-100/50 p-3.5 font-serif text-base leading-relaxed text-ink-900 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20 resize-y"
          />

          <div className="flex items-start gap-2 pt-2 text-xs text-ink-500">
            <ShieldCheck className="h-4 w-4 text-sage-500 shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Assurance:</strong> Raw profile text is not shown to others before mutual connection. Mindmate extracts only high-level resonance themes for discovery cards.
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-accent-50 p-4 text-xs font-medium text-accent-700 border border-accent-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-full bg-accent-500 px-8 py-4 text-base font-medium text-white shadow-soft transition-all hover:bg-accent-600 hover:shadow-lifted active:scale-95 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4 text-accent-200" />
            <span>{isSubmitting ? 'Saving…' : 'Explore Resonant Minds'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
