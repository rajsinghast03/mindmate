'use client';

import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { AlertCircle } from 'lucide-react';

/** Failure codes the auth routes redirect back with. */
const ERROR_COPY: Record<string, string> = {
  auth_callback_failed: 'That sign-in could not be completed. Please try again.',
  verification_failed:
    'That link is no longer valid — confirmation links expire and can only be used once. Sign in below to have a new one sent.',
  oauth_cancelled: 'Google sign-in was cancelled.',
};

export function AuthLoginClient() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? undefined;
  const errorCode = searchParams.get('error');
  const message = errorCode ? (ERROR_COPY[errorCode] ?? ERROR_COPY.auth_callback_failed) : null;

  return (
    <>
      {message && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-xs font-medium text-accent-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
          <span>{message}</span>
        </div>
      )}
      <AuthForm mode="signin" nextPath={nextPath} />
    </>
  );
}
