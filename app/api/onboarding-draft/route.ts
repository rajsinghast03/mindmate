import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, getSupabaseUrl, getSupabasePublishableKey } from '@/lib/config';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';

function getServiceClient() {
  const url = getSupabaseUrl()!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    getSupabasePublishableKey()!;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

  const supabase = getServiceClient();
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

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('onboarding_drafts')
    .select('draft')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.draft) {
    await supabase.from('onboarding_drafts').delete().eq('email', user.email.toLowerCase());
  }

  return NextResponse.json({ draft: data?.draft ?? null });
}
