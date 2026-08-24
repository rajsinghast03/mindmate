'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { setAuthNextCookie, getOnboardingDraft, safeNextPath } from '@/lib/onboarding-draft';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';

const AUTH_COMPLETE_PATH = '/auth/complete';

interface AuthFormProps {
  /** Where to land once /auth/complete has resolved any onboarding draft. */
  nextPath?: string;
}

export function AuthForm({ nextPath }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Always route through /auth/complete — it is what resolves the onboarding
   * draft — but carry the caller's destination with it, so being bounced from a
   * protected page returns you there instead of always landing on /discover.
   */
  const completePath = useMemo(() => {
    const safe = safeNextPath(nextPath, AUTH_COMPLETE_PATH);
    return safe === AUTH_COMPLETE_PATH
      ? AUTH_COMPLETE_PATH
      : `${AUTH_COMPLETE_PATH}?next=${encodeURIComponent(safe)}`;
  }, [nextPath]);

  useEffect(() => {
    setAuthNextCookie(completePath);
  }, [completePath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const supabase = createClient();
      setAuthNextCookie(completePath);
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(completePath)}`;
      const draft = getOnboardingDraft();

      if (draft?.curiosityProfile) {
        const profileValidation = validateCuriosityProfile(draft.curiosityProfile);
        if (!profileValidation.valid) {
          throw new Error(profileValidation.errors[0]);
        }
        draft.curiosityProfile = profileValidation.normalizedText;
      }

      if (draft?.curiosityProfile) {
        await fetch('/api/onboarding-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), draft }),
        });
      }

      // Deliberately no `data: { mindmate_draft }` here. Supabase writes that into
      // the user_metadata of whoever owns this address, so anyone could plant their
      // draft on a stranger's account. The draft travels via localStorage and the
      // onboarding_drafts table instead.
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;
      setStatus('sent');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not send magic link. Please try again.'
      );
    }
  };

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-sage-200 bg-sage-50/80 p-6 text-center">
        <CheckCircle className="mx-auto h-8 w-8 text-sage-500 mb-3" />
        <h3 className="font-serif text-lg font-medium text-ink-950 mb-2">
          Check your email
        </h3>
        <p className="text-sm text-ink-600 leading-relaxed">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in and continue.
        </p>
        <p className="mt-3 text-xs text-ink-500 leading-relaxed">
          If that address already has a Mindmate account, the link simply signs you in and
          your existing profile is kept.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 mb-1.5"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-paper-300 bg-paper-100/60 pl-10 pr-4 py-3 text-base text-ink-950 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-all"
          />
        </div>
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs font-medium text-accent-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-3.5 text-sm font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800 disabled:opacity-60"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Sending link…</span>
          </>
        ) : (
          <span>Send magic link</span>
        )}
      </button>
    </form>
  );
}
