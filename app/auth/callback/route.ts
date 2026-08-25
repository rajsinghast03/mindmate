import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/onboarding-draft';

const AUTH_COMPLETE = '/auth/complete';

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // OAuth providers report refusals in the query rather than by failing the
  // redirect, so without this a cancelled Google sign-in fell through to the
  // generic "callback failed" message.
  const providerError = searchParams.get('error');
  if (providerError) {
    const reason = providerError === 'access_denied' ? 'oauth_cancelled' : 'auth_callback_failed';
    return NextResponse.redirect(`${origin}/auth/login?error=${reason}`);
  }

  const nextFromQuery = searchParams.get('next');
  const nextFromCookie = getCookie(request, 'mindmate_auth_next');
  // Both sources are attacker-influencable, so validate before redirecting.
  const next = safeNextPath(nextFromQuery ?? nextFromCookie, AUTH_COMPLETE);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set('mindmate_auth_next', '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
