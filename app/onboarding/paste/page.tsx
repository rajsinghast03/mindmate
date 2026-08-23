'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import { PromptBox } from '@/components/prompt-box';
import { InspirationDrawer } from '@/components/inspiration-drawer';
import { ArrowRight, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export default function PasteProfilePage() {
  const router = useRouter();
  const { userProfile } = useMindmate();
  const [profileText, setProfileText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(true);

  // Initialize with existing profile text if already created
  useEffect(() => {
    if (userProfile?.curiosityProfile) {
      setProfileText(userProfile.curiosityProfile);
      // If they already have text, collapse the prompt box since they don't need it
      setPromptOpen(false);
    }
  }, [userProfile]);

  // Word count calculation
  const words = profileText
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
  const wordCount = profileText.trim() === '' ? 0 : words.length;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (wordCount < 30) {
      setError('Please provide at least 30–40 words so we can understand your curiosities.');
      return;
    }

    try {
      sessionStorage.setItem('temp_curiosity_profile', profileText);
      router.push('/onboarding/review');
    } catch (err) {
      console.error(err);
      router.push('/onboarding/review');
    }
  };

  const handleSelectSample = (sampleText: string) => {
    setProfileText(sampleText);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">

      {/* Step Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-paper-200 px-3 py-1 text-xs font-semibold text-ink-700 mb-3">
          <span>Step 1 of 2</span>
          <span>•</span>
          <span>Curiosity Profile</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink-950">
          Paste your Curiosity Profile
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600 max-w-lg mx-auto">
          Share the ideas, questions, crafts, and themes you keep returning to.
        </p>
      </div>

      {/* ── Prompt Generator — Inline Accordion at Top ── */}
      <div className="mb-6 rounded-2xl border border-accent-200 bg-accent-50/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setPromptOpen(p => !p)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-accent-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Don&rsquo;t have your profile yet? Generate it with AI first
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                Copy this prompt → paste into ChatGPT or Claude → bring the result back here
              </p>
            </div>
          </div>
          {promptOpen
            ? <ChevronUp className="h-4 w-4 text-ink-500 shrink-0" />
            : <ChevronDown className="h-4 w-4 text-ink-500 shrink-0" />
          }
        </button>

        {promptOpen && (
          <div className="px-5 pb-5 border-t border-accent-200/60 pt-4">
            <PromptBox />
          </div>
        )}
      </div>

      {/* Main Text Editor */}
      <form onSubmit={handleContinue} className="space-y-6">
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card transition-all focus-within:border-accent-500/80 focus-within:ring-4 focus-within:ring-accent-500/10">
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor="curiosity-profile"
              className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-700"
            >
              Your Curiosity Profile Text
            </label>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`font-medium ${
                  wordCount >= 70 && wordCount <= 160
                    ? 'text-sage-500 font-semibold'
                    : wordCount < 40
                    ? 'text-ink-400'
                    : 'text-accent-600'
                }`}
              >
                {wordCount} words
              </span>
              <span className="text-ink-400">(Ideal: 90–130 words)</span>
            </div>
          </div>

          <textarea
            id="curiosity-profile"
            rows={8}
            value={profileText}
            onChange={e => {
              setProfileText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="I keep returning to the question of... Lately, I'm exploring... In conversations, I love talking about... I hope to meet someone who..."
            className="w-full bg-transparent font-serif text-base sm:text-lg leading-relaxed text-ink-950 placeholder:text-ink-400 placeholder:font-sans placeholder:text-sm focus:outline-none resize-y"
          />

          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-accent-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={wordCount < 10}
            className={`flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium transition-all shadow-soft ${
              wordCount >= 10
                ? 'bg-ink-950 text-paper-50 hover:bg-ink-800 active:scale-95'
                : 'bg-paper-300 text-ink-400 cursor-not-allowed'
            }`}
          >
            <span>Review & Details</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Sample Inspirations Drawer */}
      <div className="mt-10">
        <InspirationDrawer onSelectSample={handleSelectSample} />
      </div>
    </div>
  );
}
