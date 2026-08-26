import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared shell for /privacy and /terms.
 *
 * Both are ordinary server components with no interactivity — they have to be
 * readable by a signed-out visitor and by Google's OAuth reviewer, who fetches
 * the URL directly. Nothing here depends on a session.
 */

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  /** Fixed date string, not new Date() — a policy that silently restamps itself every render tells the reader nothing. */
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-ink-950"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to home</span>
      </Link>

      <h1 className="font-serif text-3xl font-medium tracking-tight text-ink-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-500">
        Last updated {updated}
      </p>

      <div className="mt-6 border-l-2 border-paper-300 pl-5 text-[15px] leading-relaxed text-ink-700">
        {intro}
      </div>

      <div className="mt-10 space-y-10">{children}</div>
    </div>
  );
}

export function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 font-serif text-xl font-medium text-ink-950 sm:text-2xl">{heading}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

/** A bulleted list with the tighter rhythm the rest of the app uses. */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * For the things a reader would be annoyed to discover later. Deliberately not
 * styled as a warning — these are ordinary facts about how the service works,
 * and dressing them as alarms would be its own kind of dishonesty.
 */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-paper-200/70 px-5 py-4 text-[15px] leading-relaxed text-ink-800">
      {children}
    </div>
  );
}
