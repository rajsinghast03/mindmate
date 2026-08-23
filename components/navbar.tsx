'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import { Sparkles, MessageSquare, User, Compass } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { userProfile, conversations, matches } = useMindmate();

  const connectedCount = conversations.length;
  const suggestedCount = matches.filter(m => m.status === 'suggested').length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-paper-300/80 bg-paper-100/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-paper-50 font-serif text-lg font-bold shadow-sm transition-transform group-hover:scale-105">
            M
          </div>
          <span className="font-serif text-xl font-medium tracking-tight text-ink-950">
            Mindmate
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {userProfile ? (
            <>
              <Link
                href="/discover"
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                  pathname === '/discover'
                    ? 'bg-paper-200 text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
                }`}
              >
                <Compass className="h-4 w-4" />
                <span>Discover</span>
                {suggestedCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                    {suggestedCount}
                  </span>
                )}
              </Link>

              <Link
                href="/connections"
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                  pathname.startsWith('/connections') || pathname.startsWith('/chat')
                    ? 'bg-paper-200 text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Conversations</span>
                {connectedCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sage-500 px-1 text-[10px] font-bold text-white">
                    {connectedCount}
                  </span>
                )}
              </Link>

              <Link
                href="/profile"
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                  pathname === '/profile'
                    ? 'bg-paper-200 text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-600 hover:bg-paper-200/60 hover:text-ink-900'
                }`}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{userProfile.displayName}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/onboarding/paste"
                className="flex items-center gap-1.5 rounded-full bg-ink-950 px-4 py-2 text-sm font-medium text-paper-50 transition-all hover:bg-ink-800 hover:shadow-soft"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                <span>Find my person</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
