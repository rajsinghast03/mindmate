import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, getSupabasePublishableKey, getSupabaseUrl } from '@/lib/config';

const PROTECTED_PREFIXES = ['/discover', '/connections', '/chat', '/profile'];

/** Where a signed-in user goes instead of the marketing page. */
const SIGNED_IN_HOME = '/discover';

/**
 * Redirect while carrying over any cookies Supabase set during this request.
 *
 * `getUser()` can refresh the session, which writes new auth cookies onto
 * `supabaseResponse`. Returning a bare `NextResponse.redirect()` would drop them and
 * silently discard the refreshed session, so every redirect has to copy them across.
 */
function redirectTo(
  request: NextRequest,
  supabaseResponse: NextResponse,
  mutate: (url: URL) => void
): NextResponse {
  const url = request.nextUrl.clone();
  mutate(url);

  const response = NextResponse.redirect(url);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl()!, getSupabasePublishableKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    return redirectTo(request, supabaseResponse, url => {
      url.pathname = '/auth/login';
      url.searchParams.set('next', pathname);
    });
  }

  if (pathname.startsWith('/auth/login') && user) {
    return redirectTo(request, supabaseResponse, url => {
      url.pathname = request.nextUrl.searchParams.get('next') || SIGNED_IN_HOME;
      url.searchParams.delete('next');
    });
  }

  // A signed-in user has no use for the landing page. Handled here rather than in the
  // page component so there is no flash of marketing content before the redirect.
  // Users who haven't finished onboarding are picked up by /discover, which routes
  // them on to /auth/complete.
  if (pathname === '/' && user) {
    return redirectTo(request, supabaseResponse, url => {
      url.pathname = SIGNED_IN_HOME;
    });
  }

  return supabaseResponse;
}
