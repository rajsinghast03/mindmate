import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isSupabaseConfigured } from '@/lib/config';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';

/** How long a pre-auth draft stays claimable. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** Rejects anything that isn't a v4-shaped UUID from crypto.randomUUID(). */
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Stash an onboarding draft so it survives the trip to the confirmation inbox.
 *
 * Necessarily unauthenticated — it runs before the account exists. Migration 008
 * keys the table on a client-generated random token instead of the email address,
 * which is what makes that safe: the token is only ever transmitted inside the
 * confirmation link, so redeeming a draft requires having received that email.
 * Under the old email key, anyone could file a draft against any address.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { token?: unknown; draft?: { curiosityProfile?: unknown } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { token, draft } = body;

  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: 'A valid draft token is required' }, { status: 400 });
  }

  if (!draft?.curiosityProfile) {
    return NextResponse.json({ error: 'draft is required' }, { status: 400 });
  }

  const profileValidation = validateCuriosityProfile(draft.curiosityProfile);
  if (!profileValidation.valid) {
    return NextResponse.json(
      { error: profileValidation.errors[0], code: 'INVALID_CURIOSITY_PROFILE' },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('onboarding_drafts').upsert({
    token,
    draft: { ...draft, curiosityProfile: profileValidation.normalizedText },
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * Redeem a stashed draft. One time only — the row is deleted on read.
 *
 * No session is required: possession of the token is the credential, and it only
 * reaches the user through an email sent to an address Supabase has now verified.
 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ draft: null });
  }

  const token = req.nextUrl.searchParams.get('token');
  if (!token || !TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ draft: null });
  }

  const supabase = createServiceClient();

  // Bound how long a stashed draft can sit waiting to be claimed.
  const freshSince = new Date(Date.now() - DRAFT_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('onboarding_drafts')
    .select('draft')
    .eq('token', token)
    .gt('updated_at', freshSince)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.draft) {
    await supabase.from('onboarding_drafts').delete().eq('token', token);
  }

  return NextResponse.json({ draft: data?.draft ?? null });
}
