'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile, wired to Supabase's built-in CAPTCHA support.
 *
 * Worth knowing why this exists here rather than as a rate limit somewhere:
 * signup does not go through our server. auth-form.tsx calls
 * supabase.auth.signUp() on the browser client, so the request goes straight
 * from the visitor's browser to <project>.supabase.co. Vercel never sees it, so
 * no middleware, WAF rule or Cloudflare proxy in front of mindmate.site can
 * touch it. Supabase verifies this token server-side, which makes it the only
 * check actually standing in that request's path.
 *
 * With no site key configured this renders nothing and reports no token, so a
 * checkout without the env var still runs. That degradation is only safe while
 * the Supabase CAPTCHA toggle is off — once it is on, Supabase rejects tokenless
 * auth calls, which is the point.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_ID = 'cf-turnstile-script';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Is Turnstile configured at all? Call sites use this to stay quiet when it isn't. */
export const turnstileEnabled = Boolean(SITE_KEY);

/** Load the script once per page, no matter how many widgets mount. */
function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return;
    if (window.turnstile) return resolve();

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('turnstile failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile failed to load'));
    document.head.appendChild(script);
  });
}

export type TurnstileHandle = {
  /** Clear the spent token and ask for a fresh one. */
  reset: () => void;
};

export function Turnstile({
  onToken,
  handleRef,
  className = '',
}: {
  onToken: (token: string | null) => void;
  /** Filled with a reset() the form calls after every submit attempt. */
  handleRef?: React.MutableRefObject<TurnstileHandle | null>;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);
  const domId = useId();

  // Kept in a ref so re-rendering the parent never re-runs the effect below;
  // re-rendering the widget would throw away an unspent token.
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const reset = useCallback(() => {
    onTokenRef.current(null);
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  useEffect(() => {
    if (handleRef) handleRef.current = { reset };
  }, [handleRef, reset]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          // A token is single-use and dies after about five minutes. Someone who
          // opens signup, goes away to write their profile and comes back would
          // otherwise submit a stale one and be told, unhelpfully, that the
          // CAPTCHA failed.
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => {
            onTokenRef.current(null);
            setFailed(true);
          },
          theme: 'light',
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* already gone */
        }
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={containerRef} id={`turnstile-${domId}`} />
      {failed && (
        <p className="mt-1.5 text-xs text-accent-700">
          The verification check could not load. Disable any ad blocker for this page and reload.
        </p>
      )}
    </div>
  );
}
