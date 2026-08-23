'use client';

import React from 'react';
import Link from 'next/link';
import { useMindmate } from '@/context/mindmate-context';
import { MessageSquare, Compass, ArrowRight, Sparkles, MapPin } from 'lucide-react';

export default function ConnectionsPage() {
  const { conversations, isLoaded } = useMindmate();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-paper-200 px-3 py-1 text-xs font-semibold text-ink-700 mb-3">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Mutual Connections</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink-950">
          Your Conversations
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600">
          Private, consent-first dialogues that began with a shared question.
        </p>
      </div>

      {conversations.length > 0 ? (
        <div className="space-y-4">
          {conversations.map(convo => {
            const lastMsg =
              convo.messages.length > 0
                ? convo.messages[convo.messages.length - 1].body
                : `Starter Question: "${convo.sharedQuestion}"`;

            return (
              <Link
                key={convo.id}
                href={`/chat/${convo.id}`}
                className="group block rounded-2xl border border-paper-300 bg-paper-50 p-5 sm:p-6 shadow-soft transition-all hover:border-accent-500/50 hover:shadow-card active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-200 text-ink-950 font-serif text-xl font-semibold border border-paper-300/60 shadow-sm shrink-0">
                      {convo.candidateProfile.displayName.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-serif text-xl font-medium text-ink-950 group-hover:text-accent-600 transition-colors">
                          {convo.candidateProfile.displayName}
                        </h3>
                        <span className="text-xs text-ink-500 font-sans">
                          {convo.candidateProfile.age}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-ink-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-ink-400" />
                          {convo.candidateProfile.cityOrTimezone}
                        </span>
                      </div>

                      {/* Snippet */}
                      <p className="mt-3 font-serif text-sm text-ink-700 italic line-clamp-2">
                        &ldquo;{lastMsg}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-[11px] font-semibold text-sage-700">
                      Connected
                    </span>
                    <span className="text-[11px] text-ink-400 font-mono">
                      {convo.messages.length} {convo.messages.length === 1 ? 'message' : 'messages'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-8 sm:p-12 text-center shadow-soft max-w-lg mx-auto">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-paper-200 text-ink-600 mb-5">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-2xl font-medium text-ink-950 mb-2">
            No active conversations yet
          </h3>
          <p className="text-sm text-ink-600 leading-relaxed mb-6">
            When you discover someone who shares your curiosities and choose to connect, your private conversation will open here.
          </p>

          <Link
            href="/discover"
            className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-6 py-3 text-sm font-medium text-paper-50 shadow-soft hover:bg-ink-800 transition-all"
          >
            <Compass className="h-4 w-4" />
            <span>Discover Curated Minds</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
