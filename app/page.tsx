'use client';

import React from 'react';
import Link from 'next/link';
import { PromptBox } from '@/components/prompt-box';
import {
  Brain,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  XCircle,
  EyeOff,
  UserCheck,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-4xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24 text-center">
        {/* Anti-Lookism & AI Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-paper-300 bg-paper-50 px-4 py-1.5 text-xs font-semibold text-ink-800 shadow-sm mb-6">
          <Brain className="h-3.5 w-3.5 text-accent-500" />
          <span>AI Text-Driven Matching • Zero Appearance Bias</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight text-ink-950 leading-[1.12]">
          Matched by mind, <br className="hidden sm:inline" />
          <span className="italic font-serif text-accent-600">never by looks.</span>
        </h1>

        {/* Dynamic AI Accent Line */}
        <p className="mx-auto mt-5 max-w-2xl font-serif text-xl sm:text-2xl text-ink-900 font-medium leading-snug">
          AI that connects you through the depth of your thoughts, not a 2-second photo swipe.
        </p>

        {/* Explanatory Manifesto Subtitle */}
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-600 font-sans font-normal">
          Traditional apps reduce you to a photo and a 2-line bio—where people get judged and rejected on superficial looks before anyone knows who they truly are. Mindmate uses AI to analyze the curiosities, crafts, and questions that occupy your mind, introducing you to people who resonate with your intellect.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/onboarding/paste"
            className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-full bg-ink-950 px-8 py-4 text-base font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800 hover:shadow-lifted active:scale-95"
          >
            <span>Match with your Mindmate</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#why-text-matching"
            className="flex items-center justify-center w-full sm:w-auto rounded-full px-6 py-4 text-sm font-medium text-ink-700 hover:text-ink-950 transition-colors"
          >
            Why text matching wins &darr;
          </a>
        </div>

        {/* Key Reassurance Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-ink-500">
          <div className="flex items-center gap-1.5">
            <EyeOff className="h-4 w-4 text-accent-500" />
            <span>No photos to judge</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-sage-500" />
            <span>AI semantic resonance</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-sage-500" />
            <span>100% private until mutual opt-in</span>
          </div>
        </div>
      </section>

      {/* Comparison Section: Looks-First vs. Mind-First */}
      <section id="why-text-matching" className="w-full bg-paper-200/60 py-16 px-4 sm:px-6 border-y border-paper-300">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink-950">
              Why photo swiping fails thoughtful people
            </h2>
            <p className="text-ink-600 text-sm sm:text-base mt-2 max-w-xl mx-auto">
              Appearance-based platforms create high rejection and shallow matches. Mindmate replaces visual snap judgments with AI-powered intellectual alignment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Old Way */}
            <div className="rounded-3xl border border-red-200 bg-paper-50 p-6 sm:p-8 shadow-soft space-y-4">
              <div className="flex items-center gap-2 text-red-700 font-serif font-medium text-lg border-b border-paper-200 pb-3">
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                <span>The Superficial Photo Swipe</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-ink-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span><strong>Appearance judgment:</strong> People get rejected in under 2 seconds based solely on angles and lighting.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span><strong>Shallow 100-character bios:</strong> Job titles and one-liners fail to communicate what you actually care about.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span><strong>Endless dopamine loop:</strong> Gamified swipe decks designed to keep you scrolling rather than connecting.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span><strong>Awkward &quot;Hey&quot; openers:</strong> No shared foundation to begin meaningful conversations.</span>
                </li>
              </ul>
            </div>

            {/* The Mindmate Way */}
            <div className="rounded-3xl border border-accent-300 bg-paper-50 p-6 sm:p-8 shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent-500 text-white font-mono text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                The Mindmate AI Way
              </div>
              <div className="flex items-center gap-2 text-ink-950 font-serif font-medium text-lg border-b border-paper-200 pb-3">
                <CheckCircle2 className="h-5 w-5 text-accent-500 shrink-0" />
                <span>Pure Mind Matching</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-ink-800">
                <li className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-accent-500 shrink-0 mt-0.5" />
                  <span><strong>Zero appearance bias:</strong> No photos to browse or judge. Matches are based 100% on written curiosities.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-accent-500 shrink-0 mt-0.5" />
                  <span><strong>AI semantic intelligence:</strong> Evaluates ongoing crafts, questions, and ideas to find true cognitive resonance.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-accent-500 shrink-0 mt-0.5" />
                  <span><strong>1–3 curated introductions:</strong> High-signal, calm introductions with explicit explanations of *why* you connect.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-accent-500 shrink-0 mt-0.5" />
                  <span><strong>Shared opening question:</strong> Private chat unlocks with a tailored question that bridges both of your minds.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Copy Prompt Interactive Box Section */}
      <section className="w-full max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700 mb-2">
            <span>Step 1: Create your thought profile</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink-950">
            Generate your Curiosity Profile with AI
          </h2>
          <p className="text-sm text-ink-600 mt-1 max-w-lg mx-auto">
            Copy this privacy-safe prompt into ChatGPT, Claude, or write it directly. It extracts what makes your mind tick with zero identifying personal data.
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
      <section id="how-it-works" className="w-full bg-paper-200/40 py-20 px-4 sm:px-6 border-t border-paper-300">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink-950">
              How Mindmate connects two minds
            </h2>
            <p className="text-ink-600 text-base mt-2 max-w-xl mx-auto">
              From written thoughts to meaningful dialogues in three calm steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl bg-paper-50 p-7 border border-paper-300 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-950 text-paper-50 font-serif font-bold text-lg mb-5">
                1
              </div>
              <h3 className="font-serif text-xl font-medium text-ink-950 mb-2">
                Ask AI for your Curiosity Profile
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Copy our prompt into ChatGPT or write your own. In ~100 words, it captures the questions, crafts, and themes you keep returning to.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-paper-50 p-7 border border-paper-300 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-950 text-paper-50 font-serif font-bold text-lg mb-5">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-950 text-paper-50 font-serif font-bold text-lg mb-5">
                3
              </div>
              <h3 className="font-serif text-xl font-medium text-ink-950 mb-2">
                AI Semantic Matching
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
            Real Resonance Over Superficial Swiping
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink-950">
            Every match comes with a reason
          </h2>
        </div>

        {/* Mock Match Card */}
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card max-w-2xl mx-auto">
          <div className="flex items-start justify-between gap-4 border-b border-paper-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-200 text-ink-950 font-serif text-xl font-semibold">
                K
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-xl font-medium text-ink-950">Kabir</span>
                  <span className="text-sm text-ink-500">29</span>
                </div>
                <span className="text-xs text-ink-500">Bengaluru, Karnataka (IST, UTC+5:30)</span>
              </div>
            </div>

            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700">
              Slow Software & Tactile Craft
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
            Built for Authentic Intellectual Connection
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3.5 p-4">
              <EyeOff className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">Zero Photo Bias</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  Never be judged or rejected by a snapshot. Connect through what you think, craft, and explore.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <Lock className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">Mutual Consent Only</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  No one can message you or view your approved profile until you have both explicitly chosen to connect.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <ShieldCheck className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">Zero Scraping</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  We never access your ChatGPT account or raw chat logs. You paste and approve only what you choose to share.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <UserCheck className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">No Intent Labels</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  We don’t force you into &quot;dating&quot;, &quot;networking&quot;, or &quot;friendship&quot; buckets. Connections evolve naturally.
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
