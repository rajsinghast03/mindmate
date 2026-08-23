'use client';

import React from 'react';
import Link from 'next/link';
import {
  Brain,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  EyeOff,
  Users,
} from 'lucide-react';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Ask AI for your Curiosity Profile',
    desc: 'Use our privacy-safe prompt in ChatGPT or Claude. In ~100 words, it captures the questions, crafts, and themes you keep returning to—nothing personal, nothing identifying.',
  },
  {
    step: '02',
    title: 'Paste, Edit & Approve',
    desc: 'You review every single word before it goes anywhere. Add only a display name, age (18+), and broad location. Your raw text stays hidden until you both choose to connect.',
  },
  {
    step: '03',
    title: 'AI Finds Minds Like Yours',
    desc: 'Our AI reads the depth of your written curiosities and introduces you to 1–3 people who genuinely resonate, with a clear explanation of why—and a tailored opening question to start.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center">

      {/* ── Hero Section ── */}
      <section className="relative w-full max-w-4xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-paper-300 bg-paper-50 px-4 py-1.5 text-xs font-semibold text-ink-800 shadow-sm mb-6">
          <Brain className="h-3.5 w-3.5 text-accent-500" />
          <span>Mind-Matching Platform • Zero Appearance Bias</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight text-ink-950 leading-[1.12]">
          Find the people who{' '}
          <br className="hidden sm:inline" />
          <span className="italic font-serif text-accent-600">think like you.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl font-serif text-xl sm:text-2xl text-ink-900 font-medium leading-snug">
          Your next co-founder, creative collaborator, intellectual friend, or
          hobby partner—matched through pure curiosity and AI text resonance.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/onboarding/paste"
            className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-full bg-ink-950 px-8 py-4 text-base font-medium text-paper-50 shadow-soft transition-all hover:bg-ink-800 hover:shadow-lifted active:scale-95"
          >
            <span>Find people who think like you</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#find-minds"
            className="flex items-center justify-center w-full sm:w-auto rounded-full px-6 py-4 text-sm font-medium text-ink-700 hover:text-ink-950 transition-colors"
          >
            How it works &darr;
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-ink-500">
          <div className="flex items-center gap-1.5">
            <EyeOff className="h-4 w-4 text-accent-500" />
            <span>Zero photo judgment</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <Brain className="h-4 w-4 text-sage-500" />
            <span>AI semantic mind matching</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-sage-500" />
            <span>Private until mutual opt-in</span>
          </div>
        </div>
      </section>

      {/* ── AI Insight Statement Bar ── */}
      <section className="w-full bg-ink-950 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-serif text-xl sm:text-2xl md:text-3xl text-paper-50 font-medium leading-snug italic">
            &ldquo;Today, AI knows you better than most people do.<br className="hidden sm:inline" />
            That&rsquo;s exactly why we use it—to find the ones who truly get you.&rdquo;
          </p>
          <p className="mt-4 text-sm sm:text-base text-paper-400 font-sans leading-relaxed max-w-xl mx-auto">
            Mindmate takes the curiosity profile you&rsquo;ve already shared with AI and uses it to introduce you to people whose minds genuinely resonate with yours. No photos. No bios. Just thought.
          </p>
        </div>
      </section>

      {/* ── Two-Column: Who You Can Meet + How It Works ── */}
      <section
        id="find-minds"
        className="w-full bg-paper-50 py-16 px-4 sm:px-6 border-y border-paper-300"
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <div className="inline-block rounded-full bg-ink-950 px-3 py-1 text-xs font-semibold text-paper-50 mb-3">
              3 Simple Steps
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink-950">
              How Mindmate works
            </h2>
            <p className="text-ink-600 text-sm sm:text-base mt-2 max-w-md mx-auto">
              From written thoughts to meaningful connections in three calm steps.
            </p>
          </div>

          <ol className="space-y-6">
            {HOW_IT_WORKS.map((item) => (
              <li key={item.step} className="flex items-start gap-5 rounded-2xl border border-paper-300 bg-paper-100/60 p-6 shadow-soft">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-950 text-paper-50 font-serif font-bold text-base">
                  {item.step}
                </div>
                <div className="pt-1">
                  <h3 className="font-serif text-lg font-medium text-ink-950 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Example Resonance Card ── */}
      <section className="w-full max-w-4xl py-20 px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-block rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700 mb-3">
            Every Introduction Has a Reason
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink-950">
            Not just a match — a resonance
          </h2>
          <p className="text-ink-600 text-sm sm:text-base mt-2 max-w-lg mx-auto">
            You always know <em>why</em> two minds connect. No guessing. No awkward small talk.
          </p>
        </div>

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
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700 shrink-0">
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
                Suggested Opening Question
              </span>
              <p className="font-serif text-base text-ink-950 font-medium">
                &ldquo;What would you try building or exploring this year if you knew nobody would judge you for being a beginner?&rdquo;
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button className="rounded-full px-4 py-2 text-xs font-medium text-ink-500 hover:bg-paper-200 transition-colors">
              Skip for now
            </button>
            <button className="rounded-full bg-accent-500 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-accent-600 transition-colors">
              Start a conversation
            </button>
          </div>
        </div>
      </section>

      {/* ── Core Principles Grid ── */}
      <section className="w-full bg-paper-50 py-20 px-4 sm:px-6 border-t border-paper-300">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-serif text-3xl font-medium text-ink-950 text-center mb-12">
            Built for real intellectual synergy
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
              <Users className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-medium text-ink-950">Fluid Connections</h4>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  Whether it becomes a co-founding team, a creative project, an intellectual friendship, or a collaborative hobby—connections evolve on your terms.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/onboarding/paste"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink-950 px-8 py-4 text-base font-medium text-paper-50 shadow-soft hover:bg-ink-800 transition-all"
            >
              <span>Find People Who Think Like You</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
