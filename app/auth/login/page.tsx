import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { AuthLoginClient } from "./auth-login-client";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 transition-colors hover:text-ink-950"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to home</span>
      </Link>

      <div className="mb-5 text-center">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink-950">
          Sign in to Mindmate
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Continue with Google, or use the email and password you signed up with.
        </p>
      </div>

      <div className="rounded-3xl border border-paper-300 bg-paper-50 p-5 shadow-card sm:p-6">
        <Suspense
          fallback={
            <div className="h-72 animate-pulse rounded-xl bg-paper-200" />
          }
        >
          <AuthLoginClient />
        </Suspense>

        <p className="mt-5 text-center text-xs text-ink-600">
          New to Mindmate?{" "}
          <Link
            href="/onboarding/paste"
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
          >
            Create your Curiosity Profile
          </Link>
        </p>

        <div className="mt-4 flex items-start gap-2 border-t border-paper-200 pt-3 text-[11px] leading-snug text-ink-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage-500" />
          <span>Your email is only used for authentication.</span>
        </div>
      </div>
    </div>
  );
}
