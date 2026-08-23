'use client';

import React from 'react';
import Link from 'next/link';
import { PromptBox } from '@/components/prompt-box';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Lock, MessageSquare } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-4xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 text-center">
        {/* Subtle pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-paper-300 bg-paper-50 px-3.5 py-1.5 text-xs font-medium text-ink-700 shadow-sm mb-6">
          <Sparkles className="h-3.5 w-3.5 text-accent-500" />
          <span>A calm, curiosity-first connection platform</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight text-ink-950 leading-[1.15]">
          Meet people through the questions they <span className="italic font-serif text-accent-600">can’t stop asking.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-ink-700 font-sans font-normal">
          Not through a shallow bio, job title, or swipe feed. Mindmate introduces you through the ideas, crafts, and curiosities that actually occupy your mind.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/onboarding/paste"
            className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-full bg-ink-950 px-8 py-4 text-base font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800 hover:shadow-lifted active:scale-95"
          >
            <span>Find someone who gets you</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center justify-center w-full sm:w-auto rounded-full px-6 py-4 text-sm font-medium text-ink-700 hover:text-ink-950 transition-colors"
          >
            How it works
          </a>
        </div>

        {/* Privacy reassurance pill */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500">
          <ShieldCheck className="h-4 w-4 text-sage-500" />
          <span>We never connect to ChatGPT or read your chat history. You are always in control.</span>
        </div>
      </section>

      {/* Copy Prompt Interactive Box Section */}
      <section className="w-full max-w-3xl px-4 pb-20 sm:px-6">
        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink-950">
            Step 1: Get your Curiosity Profile
          </h2>
          <p className="text-sm text-ink-600 mt-1 max-w-lg mx-auto">
            Copy this prompt into ChatGPT, Claude, or write it directly. It extracts what makes your mind tick without sharing any sensitive personal data.
          </p>
        </div>

        <PromptBox />

        <div className="mt-6 text-center">
          <Link
            href="/onboarding/paste"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent-600 hover:text-accent-700 underline underline-offset-4"
          >
            <span>Have your profile ready? Paste it here &rarr;</span>
          </Link>
        </div>
      </section>

      {/* How it Works 3 Steps */}
      <section id="how-it-works" className="w-full bg-paper-200/60 py-20 px-4 sm:px-6 border-y border-paper-300">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink-950">
              Connection designed for thoughtful minds
            </h2>
            <p className="text-ink-600 text-base mt-2 max-w-xl mx-auto">
              No infinite feeds. No forced labels like &quot;dating&quot; vs &quot;networking&quot;. Just honest human resonance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl bg-paper-50 p-7 border border-paper-300 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-200 text-ink-950 font-serif font-bold text-lg mb-5">
                1
              </div>
              <h3 className="font-serif text-xl font-medium text-ink-950 mb-2">
                Ask AI for your Curiosity Profile
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Copy our prompt into ChatGPT or write your own. In 100 words, it captures the questions, crafts, and themes you keep returning to.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-paper-50 p-7 border border-paper-300 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-200 text-ink-950 font-serif font-bold text-lg mb-5">
                2
              </div>
              <h3 className="font-serif text-xl font-medium text-ink-950 mb-2">
                Paste, Edit & Approve
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                You review every single word. Add only a display name, age (18+), and broad timezone. Raw profile text is hidden until mutual connection.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl bg-paper-50 p-7 border border-paper-300 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-200 text-ink-950 font-serif font-bold text-lg mb-5">
                3
              </div>
              <h3 className="font-serif text-xl font-medium text-ink-950 mb-2">
                Meet through Shared Questions
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Receive 1–3 curated introductions with an explanation of *why* you connect. Once both people accept, chat opens with a tailored opening question.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Resonance Card Preview */}
      <section className="w-full max-w-4xl py-20 px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-block rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700 mb-3">
            What an introduction looks like
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink-950">
            No fake scores. Real human reasons.
          </h2>
        </div>

        {/* Mock Match Card */}
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card max-w-2xl mx-auto">
          <div className="flex items-start justify-between gap-4 border-b border-paper-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-200 text-ink-950 font-serif text-xl font-semibold">
                J
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-xl font-medium text-ink-950">Julian</span>
                  <span className="text-sm text-ink-500">29</span>
                </div>
                <span className="text-xs text-ink-500">Edinburgh (GMT)</span>
              </div>
            </div>

            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700">
              Tactile Design & Slow Living
            </span>
          </div>

          <div className="my-5 space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-500 font-semibold">
              Why your minds connect
            </div>
            <p className="font-serif text-lg leading-relaxed text-ink-900 bg-paper-100/80 p-4 rounded-2xl border border-paper-200/80 italic">
              &ldquo;You both return to making things thoughtfully, escaping superficial small talk, and noticing the quiet details in everyday life.&rdquo;
            </p>

            <div className="rounded-2xl border border-dashed border-paper-300 bg-paper-100/40 p-3.5">
              <span className="text-xs font-medium text-ink-600 block mb-1">
                Suggested First Question
              </span>
              <p className="font-serif text-base text-ink-950 font-medium">
                &ldquo;What would you try exploring this year if you knew nobody would judge you for being a beginner?&rdquo;
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button className="rounded-full px-4 py-2 text-xs font-medium text-ink-500">
              Not for me
            </button>
            <button className="rounded-full bg-accent-500 px-5 py-2 text-xs font-medium text-white shadow-sm">
              I&apos;d like to connect
            </button>
          </div>
        </div>
      </section>

      {/* Core Principles Grid */}
      <section className="w-full bg-paper-50 py-20 px-4 sm:px-6 border-t border-paper-300">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-serif text-3xl font-medium text-ink-950 text-center mb-12">
            Our Commitments to You
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3.5 p-4">
              <CheckCircle2 className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">No Intent Labels</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  We don’t force you into &quot;dating&quot;, &quot;networking&quot;, or &quot;friendship&quot; buckets. Connections evolve naturally.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <Lock className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">Mutual Consent Only</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  No one can send you a message or view your profile text unless you have both explicitly opted in.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <ShieldCheck className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">Zero Scraping</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  We never access your ChatGPT account or raw chat logs. You paste only what you choose to share.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <MessageSquare className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">Fewer, Better Matches</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  We show 1–3 high-resonance introductions at a time, eliminating endless mindless swiping.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/onboarding/paste"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink-950 px-8 py-4 text-base font-medium text-paper-50 shadow-soft hover:bg-ink-800 transition-all"
            >
              <span>Get Started with Mindmate</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
