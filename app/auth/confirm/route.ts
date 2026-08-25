import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sameOriginPath } from '@/lib/onboarding-draft';

const AUTH_COMPLETE = '/auth/complete';

/** The only OTP types this app sends. Anything else is rejected rather than forwarded. */
const ALLOWED_TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'email_change'];

/**
 * Verify a link from a Supabase auth email.
 *
 * Deliberately token-hash based rather than using `{{ .ConfirmationURL }}`. That
 * default lands on /auth/callback with a `?code`, and @supabase/ssr uses PKCE — the
 * code verifier lives in the browser that started signup, so opening the link on a
 * phone fails the exchange. `verifyOtp` carries no verifier and works from any
 * browser, which is the whole point of a confirmation email.
 *
 * The templates must therefore be:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // `next` arrives from {{ .RedirectTo }} as an absolute URL. Both it and the
  // recovery default are attacker-influencable, so neither is trusted raw.
  const fallback = type === 'recovery' ? '/auth/reset-password' : AUTH_COMPLETE;
  const next = sameOriginPath(searchParams.get('next'), origin, fallback);

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/auth/login?error=verification_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // Expired and already-used links land here too, which is why the login page
    // offers to resend rather than treating this as a dead end.
    return NextResponse.redirect(`${origin}/auth/login?error=verification_failed`);
  }

  // A recovery link must reach the set-a-new-password screen even if the template
  // carried a stale `next`; the session it just minted is meant for exactly that.
  const destination = type === 'recovery' ? '/auth/reset-password' : next;

  const response = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.set('mindmate_auth_next', '', { path: '/', maxAge: 0 });
  return response;
}
