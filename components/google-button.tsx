'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { setAuthNextCookie } from '@/lib/onboarding-draft';
import { Loader2 } from 'lucide-react';

/** Google's mark, inlined — a strict CSP and a remote asset are not worth trading. */
function GoogleMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

interface GoogleButtonProps {
  /** Path to land on once /auth/complete has resolved any onboarding draft. */
  completePath: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Google sign-in. There is no separate signup — an address Google vouches for
 * either has a Mindmate account or gets one, and /auth/complete sorts out which.
 *
 * No email is sent anywhere in this path: Google has already verified the address,
 * so Supabase marks it confirmed on arrival.
 */
export function GoogleButton({
  completePath,
  label = 'Continue with Google',
  disabled = false,
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Belt and braces: the OAuth round trip carries ?next on redirectTo, but the
      // provider allowlist can normalise query params away.
      setAuthNextCookie(completePath);

      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(completePath)}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      // On success the browser has already been sent to Google, so nothing below runs.
      if (oauthError) throw oauthError;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Could not reach Google. Please try again.');
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-paper-300 bg-paper-50 px-6 py-3.5 text-sm font-medium text-ink-900 shadow-soft transition-all hover:bg-paper-100 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleMark className="h-[18px] w-[18px]" />
        )}
        <span>{loading ? 'Redirecting…' : label}</span>
      </button>

      {error && <p className="text-center text-xs font-medium text-accent-600">{error}</p>}
    </div>
  );
}
