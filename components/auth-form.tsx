'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { setAuthNextCookie, getOnboardingDraft, safeNextPath } from '@/lib/onboarding-draft';
import { GoogleButton } from '@/components/google-button';
import { Mail, Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';
import { Turnstile, TurnstileHandle, turnstileEnabled } from '@/components/turnstile';

const AUTH_COMPLETE_PATH = '/auth/complete';

/** Matches the minimum configured in Supabase → Auth → Providers → Email. */
const MIN_PASSWORD_LENGTH = 8;

type Status = 'idle' | 'loading' | 'sent' | 'unconfirmed' | 'exists' | 'error';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  /** Where to land once /auth/complete has resolved any onboarding draft. */
  nextPath?: string;
}

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const isSignup = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

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

  const resetError = () => {
    if (status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  /**
   * Stash the in-progress Curiosity Profile so it survives the trip to the inbox.
   *
   * Keyed by a random token rather than the email address: the token only ever
   * appears inside the confirmation link, so only whoever received that mail can
   * redeem it. Keying by email meant anyone could file a draft against any address.
   */
  const stashDraft = async (): Promise<string | null> => {
    const draft = getOnboardingDraft();
    if (!draft?.curiosityProfile) return null;

    const validation = validateCuriosityProfile(draft.curiosityProfile);
    if (!validation.valid) throw new Error(validation.errors[0]);

    const token = crypto.randomUUID();
    const res = await fetch('/api/onboarding-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        draft: { ...draft, curiosityProfile: validation.normalizedText },
      }),
    });

    // The localStorage copy still covers the same-browser case, so a failed stash
    // degrades to "verify in this browser" rather than losing the profile.
    return res.ok ? token : null;
  };

  /**
   * Where the confirmation email should land, draft token included.
   *
   * Shared by signup and resend so the two cannot drift — they did, and the
   * resend was silently dropping the token. Re-stashing on a resend is safe:
   * stashDraft mints a fresh token from the localStorage copy, and the user has
   * to be in the original browser to have reached the Resend button at all. The
   * orphaned first token expires on its own 24-hour TTL.
   */
  const confirmationRedirect = async (): Promise<string> => {
    const token = await stashDraft();
    const redirect = new URL(completePath, window.location.origin);
    if (token) redirect.searchParams.set('draft', token);
    return redirect.toString();
  };

  const handleSignup = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
    }
    if (password !== confirmPassword) {
      throw new Error('Those two passwords do not match.');
    }

    const redirect = await confirmationRedirect();

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirect, captchaToken: captchaToken ?? undefined },
    });

    if (error) throw error;

    // Supabase does not error on an address that already has an account — it
    // returns an obfuscated user with no identities. Telling the two apart makes
    // signup an enumeration oracle: anyone can now learn whether an address is
    // registered here. That is a deliberate call, taken because the alternative
    // was sending someone to an inbox that will never receive anything.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setStatus('exists');
      return;
    }

    setStatus('sent');
  };

  const handleSignin = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken: captchaToken ?? undefined },
    });

    if (error) {
      if (error.code === 'email_not_confirmed' || /confirm/i.test(error.message)) {
        setStatus('unconfirmed');
        return;
      }
      if (error.code === 'invalid_credentials' || /invalid login/i.test(error.message)) {
        throw new Error('That email and password do not match.');
      }
      throw error;
    }

    // Full navigation, not router.push: the provider read the session once at mount
    // and would still believe nobody is signed in, so /auth/complete would bounce
    // straight back here.
    window.location.assign(completePath);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      if (isSignup) await handleSignup();
      else await handleSignin();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isSignup
            ? 'Could not create your account. Please try again.'
            : 'Could not sign you in. Please try again.'
      );
    } finally {
      // A Turnstile token is spent the moment Supabase verifies it. Without this,
      // getting your password wrong once means the retry fails with a CAPTCHA
      // error rather than "wrong password" — the confusing failure that makes
      // people give up rather than try again.
      turnstileRef.current?.reset();
    }
  };

  const handleResend = async () => {
    setResendState('sending');
    try {
      const supabase = createClient();
      await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        // Without this the resent link carries no draft token, and the profile
        // the user wrote before signing up is gone — they confirm successfully
        // and land on an empty /onboarding/paste. It survived testing because
        // the localStorage copy covers the same-browser case, which is the only
        // case anyone checks by hand.
        options: {
          emailRedirectTo: await confirmationRedirect(),
          captchaToken: captchaToken ?? undefined,
        },
      });
    } catch {
      // Reported as sent regardless — same reason the signup panel is unconditional.
    } finally {
      turnstileRef.current?.reset();
    }
    setResendState('sent');
  };

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-sage-200 bg-sage-50/80 p-6 text-center">
        <CheckCircle className="mx-auto mb-3 h-8 w-8 text-sage-500" />
        <h3 className="mb-2 font-serif text-lg font-medium text-ink-950">Confirm your email</h3>
        <p className="text-sm leading-relaxed text-ink-600">
          We sent a confirmation link to <strong>{email}</strong>. Open it to verify this address
          and finish setting up your account.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          You will not be able to sign in until the address is verified. The link expires, and
          works only once.
        </p>
      </div>
    );
  }

  if (status === 'exists') {
    return (
      <div className="rounded-2xl border border-paper-300 bg-paper-100 p-6 text-center">
        <Mail className="mx-auto mb-3 h-8 w-8 text-ink-500" />
        <h3 className="mb-2 font-serif text-lg font-medium text-ink-950">
          You already have an account
        </h3>
        <p className="text-sm leading-relaxed text-ink-600">
          <strong>{email}</strong> is already registered with Mindmate. Sign in with your existing
          password instead — nothing has been changed or overwritten.
        </p>

        <Link
          href={`/auth/login?next=${encodeURIComponent(safeNextPath(nextPath, '/discover'))}`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-950 px-5 py-2.5 text-xs font-medium text-paper-50 transition-colors hover:bg-ink-800"
        >
          <span>Sign in instead</span>
        </Link>

        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-3 block w-full text-xs text-ink-500 hover:text-ink-950"
        >
          Use a different address
        </button>
      </div>
    );
  }

  if (status === 'unconfirmed') {
    return (
      <div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 text-center">
        <Mail className="mx-auto mb-3 h-8 w-8 text-accent-500" />
        <h3 className="mb-2 font-serif text-lg font-medium text-ink-950">
          Verify your email first
        </h3>
        <p className="text-sm leading-relaxed text-ink-600">
          <strong>{email}</strong> has not been confirmed yet. Open the link we sent you, then
          come back and sign in.
        </p>

        {resendState === 'sent' ? (
          <p className="mt-4 text-xs font-medium text-sage-700">
            Sent again — check your inbox and spam folder.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendState === 'sending'}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-950 px-5 py-2.5 text-xs font-medium text-paper-50 transition-colors hover:bg-ink-800 disabled:opacity-60"
          >
            {resendState === 'sending' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Send the link again</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setResendState('idle');
          }}
          className="mt-3 block w-full text-xs text-ink-500 hover:text-ink-950"
        >
          Use a different address
        </button>
      </div>
    );
  }

  const loading = status === 'loading';

  return (
    <div className="space-y-5">
      <GoogleButton completePath={completePath} disabled={loading} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-300" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">or</span>
        <span className="h-px flex-1 bg-paper-300" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-700"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                resetError();
              }}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-paper-300 bg-paper-100/60 py-3 pl-10 pr-4 text-base text-ink-950 transition-all placeholder:text-ink-600 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-700"
            >
              Password
            </label>
            {!isSignup && (
              <Link
                href="/auth/forgot-password"
                className="text-xs text-ink-500 underline-offset-4 hover:text-accent-800 hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                resetError();
              }}
              placeholder={isSignup ? `At least ${MIN_PASSWORD_LENGTH} characters` : '••••••••'}
              className="w-full rounded-xl border border-paper-300 bg-paper-100/60 py-3 pl-10 pr-11 text-base text-ink-950 transition-all placeholder:text-ink-600 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition-colors hover:text-ink-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isSignup && (
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-700"
            >
              Confirm password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  resetError();
                }}
                placeholder="Type it once more"
                className="w-full rounded-xl border border-paper-300 bg-paper-100/60 py-3 pl-10 pr-4 text-base text-ink-950 transition-all placeholder:text-ink-600 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
              />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 text-xs font-medium text-accent-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Turnstile onToken={setCaptchaToken} handleRef={turnstileRef} />

        <button
          type="submit"
          // Only gate on the token when Turnstile is actually configured —
          // otherwise a deployment without the site key would have a button
          // nobody could ever press.
          disabled={loading || (turnstileEnabled && !captchaToken)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-3.5 text-sm font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isSignup ? 'Creating your account…' : 'Signing in…'}</span>
            </>
          ) : (
            <span>{isSignup ? 'Create account' : 'Sign in'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
