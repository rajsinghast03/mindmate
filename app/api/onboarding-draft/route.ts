import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isSupabaseConfigured } from '@/lib/config';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';

/** How long a pre-auth draft stays claimable. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** Save draft before magic link (pre-auth). */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { email?: unknown; draft?: { curiosityProfile?: unknown } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }
  const { email, draft } = body;

  if (!email || !draft?.curiosityProfile) {
    return NextResponse.json({ error: 'email and draft required' }, { status: 400 });
  }

  const profileValidation = validateCuriosityProfile(draft.curiosityProfile);
  if (!profileValidation.valid) {
    return NextResponse.json({ error: profileValidation.errors[0], code: 'INVALID_CURIOSITY_PROFILE' }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('onboarding_drafts').upsert({
    email: String(email).trim().toLowerCase(),
    draft: { ...draft, curiosityProfile: profileValidation.normalizedText },
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Load draft after magic link (authenticated). */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ draft: null });
  }

  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Anyone can write a draft against any address, so bound how long one can sit
  // waiting to be claimed. /auth/complete additionally never auto-saves a
  // server-recovered draft — it routes to review for explicit approval.
  const freshSince = new Date(Date.now() - DRAFT_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('onboarding_drafts')
    .select('draft')
    .eq('email', user.email.toLowerCase())
    .gt('updated_at', freshSince)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.draft) {
    await supabase.from('onboarding_drafts').delete().eq('email', user.email.toLowerCase());
  }

  return NextResponse.json({ draft: data?.draft ?? null });
}
