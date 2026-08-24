import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const AUTH_COMPLETE = '/auth/complete';

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextFromQuery = searchParams.get('next');
  const nextFromCookie = getCookie(request, 'mindmate_auth_next');
  const next = nextFromQuery ?? nextFromCookie ?? AUTH_COMPLETE;

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
