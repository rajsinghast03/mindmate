'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Choose a new password.
 *
 * Reached with a live session: /auth/confirm verifies the recovery token and mints
 * one before forwarding here, which is what authorises the updateUser call below.
 * Middleware treats this as a protected path, so arriving without that session
 * bounces to sign-in rather than rendering a form that cannot work.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'checking' | 'idle' | 'loading' | 'error' | 'expired'>(
    'checking'
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      // Middleware normally catches this; the check here covers a session that
      // expired between the redirect and the form being filled in.
      setStatus(data.session ? 'idle' : 'expired');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus('error');
      setErrorMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMessage('Those two passwords do not match.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Full navigation so the provider picks up the refreshed session.
      window.location.assign('/discover');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not update your password. Please try again.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink-950">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          You&apos;ll be signed in with it straight away.
        </p>
      </div>

      <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 shadow-card sm:p-8">
        {status === 'checking' && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        )}

        {status === 'expired' && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-accent-500" />
            <h3 className="mb-2 font-serif text-lg font-medium text-ink-950">
              This reset link has expired
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-ink-600">
              Reset links can only be used once, and not long after they are sent.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-5 py-2.5 text-xs font-medium text-paper-50 transition-colors hover:bg-ink-800"
            >
              <span>Request a new link</span>
            </Link>
          </div>
        )}

        {(status === 'idle' || status === 'loading' || status === 'error') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-700"
              >
                New password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
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

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-700"
              >
                Confirm new password
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
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="Type it once more"
                  className="w-full rounded-xl border border-paper-300 bg-paper-100/60 py-3 pl-10 pr-4 text-base text-ink-950 transition-all placeholder:text-ink-600 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-2 text-xs font-medium text-accent-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-3.5 text-sm font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800 disabled:opacity-60"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save new password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
