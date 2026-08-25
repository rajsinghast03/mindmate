'use client';

import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';

export function AuthSignupClient() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? undefined;
  return <AuthForm mode="signup" nextPath={nextPath} />;
}
