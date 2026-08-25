'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const supabase = createClient();
      // The template sends people to /auth/confirm?type=recovery, which mints the
      // session and forwards here; this redirectTo is the post-verification landing.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      // Note the error is swallowed for anything that would reveal whether the
      // address is registered — see the panel copy below.
      if (error && !/user not found/i.test(error.message)) throw error;

      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not send the reset link. Please try again.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/auth/login"
        className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 transition-colors hover:text-ink-950"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to sign in</span>
      </Link>

      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink-950">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ll email you a link to choose a new one.
        </p>
      </div>

      <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 shadow-card sm:p-8">
        {status === 'sent' ? (
          <div className="rounded-2xl border border-sage-200 bg-sage-50/80 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-8 w-8 text-sage-500" />
            <h3 className="mb-2 font-serif text-lg font-medium text-ink-950">Check your email</h3>
            <p className="text-sm leading-relaxed text-ink-600">
              If <strong>{email}</strong> has a Mindmate account, a reset link is on its way.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Signed up with Google? There is no password to reset — use{' '}
              <Link href="/auth/login" className="text-accent-700 underline-offset-4 hover:underline">
                Continue with Google
              </Link>{' '}
              instead.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="you@example.com"
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
                  <span>Sending link…</span>
                </>
              ) : (
                <span>Send reset link</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
