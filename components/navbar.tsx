'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import { Logo } from '@/components/logo';
import { Sparkles, MessageSquare, User, Compass, LogOut, ArrowRight, ShieldAlert } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { userProfile, conversations, matches, isSupabaseMode, authUser, isLoaded, signOut } =
    useMindmate();

  // Having an account and having finished onboarding are different things, and the
  // nav used to conflate them: a user who signed in with Google but had not written
  // a Curiosity Profile yet was shown "Sign in" for the whole of onboarding.
  const signedIn = isSupabaseMode ? !!authUser : !!userProfile;

  // Already inside the flow the CTA points at. Showing "Finish your profile" here
  // is telling someone to do the thing they are visibly doing, and the link just
  // loops back through /auth/complete to the page they are already on.
  const inOnboarding =
    pathname.startsWith('/onboarding') || pathname.startsWith('/auth');

  const suggestedCount = matches.filter(m => m.status === 'suggested').length;
  const incomingRequestCount = matches.filter(
    m => m.status === 'requested' && m.direction === 'incoming'
  ).length;
  // Both halves are things the user has to act on. A plain conversation count was
  // not — it never went down, so it never meant anything.
  const unreadCount = conversations.reduce((total, c) => total + c.unreadCount, 0);
  const connectionsCount = unreadCount + incomingRequestCount;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-paper-300/80 bg-paper-100/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        {/* Point straight at the app once there's a profile — middleware would
            bounce "/" to /discover anyway, and this avoids the round-trip. */}
        <Logo size="sm" showWordmark={true} href={signedIn ? '/discover' : '/'} />

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {!isLoaded ? (
            // Neither branch until the session is known. Rendering the logged-out one
            // meant "Sign in" flashed on every load and every tab return, for as long
            // as /api/profile took. Fixed width so nothing shifts when it resolves.
            <div
              aria-hidden="true"
              className="h-8 w-28 animate-pulse rounded-full bg-paper-200 sm:w-40"
            />
          ) : signedIn && !userProfile ? (
            // Signed in, onboarding unfinished. Note Google has no separate sign-up:
            // signing in with an unregistered address creates the account, so this is
            // the normal first-run state for an OAuth user, not an error.
            <>
              {!inOnboarding && (
                <Link
                  href="/auth/complete"
                  className="flex items-center gap-1.5 rounded-full bg-ink-950 px-4 py-2 text-sm font-medium text-paper-50 transition-all hover:bg-ink-800 hover:shadow-soft"
                >
                  <span className="hidden sm:inline">Finish your profile</span>
                  <span className="sm:hidden">Finish</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}

              {isSupabaseMode && authUser && (
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-500 transition-all hover:bg-paper-200/60 hover:text-ink-800"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              )}
            </>
          ) : userProfile ? (
            <>
              <Link
                href="/discover"
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-all sm:px-3.5 ${
                  pathname === '/discover'
                    ? 'bg-paper-200 text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
                }`}
              >
                <Compass className="h-4 w-4" />
                <span className="hidden sm:inline">Discover</span>
                {suggestedCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                    {suggestedCount}
                  </span>
                )}
              </Link>

              <Link
                href="/connections"
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-all sm:px-3.5 ${
                  pathname.startsWith('/connections') || pathname.startsWith('/chat')
                    ? 'bg-paper-200 text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Conversations</span>
                {connectionsCount > 0 && (
                  <span
                    className={`ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                      incomingRequestCount > 0 ? 'bg-accent-500' : 'bg-sage-500'
                    }`}
                  >
                    {connectionsCount}
                  </span>
                )}
              </Link>

              {authUser?.isAdmin && (
                <Link
                  href="/admin/reports"
                  title="Report queue"
                  aria-label="Report queue"
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-all sm:px-3.5 ${
                    pathname.startsWith('/admin')
                      ? 'bg-paper-200 text-ink-950 font-semibold shadow-sm'
                      : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                </Link>
              )}

              <Link
                href="/profile"
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-all sm:px-3.5 ${
                  pathname === '/profile'
                    ? 'bg-paper-200 text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
                }`}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{userProfile.displayName}</span>
              </Link>

              {isSupabaseMode && authUser && (
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-500 hover:bg-paper-200/60 hover:text-ink-800 transition-all"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              )}
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-600 transition-all hover:bg-paper-200/60 hover:text-ink-900"
              >
                Sign in
              </Link>

              <Link
                href="/onboarding/paste"
                className="flex items-center gap-1.5 rounded-full bg-ink-950 px-4 py-2 text-sm font-medium text-paper-50 transition-all hover:bg-ink-800 hover:shadow-soft"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                <span className="hidden sm:inline">Find minds like yours</span>
                <span className="sm:hidden">Get started</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
