import { Suspense } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { AuthLoginClient } from './auth-login-client';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-950 mb-8 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to home</span>
      </Link>

      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink-950">
          Sign in to Mindmate
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ll email you a secure link — no password needed.
        </p>
      </div>

      <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card">
        <Suspense
          fallback={
            <div className="h-32 animate-pulse rounded-xl bg-paper-200" />
          }
        >
          <AuthLoginClient />
        </Suspense>

        <div className="mt-6 flex items-start gap-2 text-xs text-ink-500 border-t border-paper-200 pt-4">
          <ShieldCheck className="h-4 w-4 text-sage-500 shrink-0 mt-0.5" />
          <span>
            Your email is only used for authentication. We never access your ChatGPT account or chat history.
          </span>
        </div>
      </div>
    </div>
  );
}
