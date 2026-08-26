import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isSupabaseConfigured } from '@/lib/config';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';

/** How long a pre-auth draft stays claimable. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** Rejects anything that isn't a v4-shaped UUID from crypto.randomUUID(). */
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Longest we will store for each free-text field. Generous next to what the
 * onboarding form can actually produce — these are a backstop against a caller
 * that is not the form, not a validation rule for people.
 */
const FIELD_MAX = 200;

/**
 * Keep only the fields the onboarding form actually sends.
 *
 * The row used to be written as `{ ...draft, curiosityProfile: normalized }`,
 * which stored whatever else the caller put in the object. Only curiosityProfile
 * was ever validated or capped, so every other key went into the JSONB column
 * unexamined and unbounded — the sole ceiling being the ~4.5MB platform body
 * limit. Against a 500MB database that is a storage-exhaustion path, and this
 * endpoint has to stay unauthenticated because it runs before the account exists.
 *
 * An allow-list rather than a block-list: new keys are dropped by default, which
 * is the direction you want to fail in when the endpoint is open to anyone.
 */
function pickDraftFields(draft: Record<string, unknown>, curiosityProfile: string) {
  const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, FIELD_MAX) : undefined;

  const age = Number(draft.age);

  return {
    curiosityProfile,
    displayName: text(draft.displayName),
    // Bounded to the same range the profile API and the age CHECK enforce, so a
    // draft can never carry a value the real save would reject.
    age: Number.isFinite(age) && age >= 18 && age <= 120 ? Math.floor(age) : undefined,
    cityOrTimezone: text(draft.cityOrTimezone),
    ianaTimezone: text(draft.ianaTimezone) ?? null,
    countryCode: text(draft.countryCode),
    state: text(draft.state) ?? null,
    city: text(draft.city) ?? null,
  };
}

/** The instant before which a draft is expired and must no longer exist. */
function expiredBefore(): string {
  return new Date(Date.now() - DRAFT_TTL_MS).toISOString();
}

/**
 * Delete drafts past the TTL, on the way past.
 *
 * The TTL used to be a read filter only, so an abandoned signup left its
 * Curiosity Profile, display name, age and city sitting in this table forever —
 * unreadable through the API, but very much still stored. Migration 008 keys the
 * table on a random token with no foreign key to profiles, which is what makes
 * the draft safe to accept before an account exists, but it also means deleting
 * an account cannot reach these rows. Nothing else would ever remove them.
 *
 * Opportunistic rather than scheduled: this table only sees traffic during
 * signup, so piggy-backing on that traffic keeps expired rows from accumulating
 * without needing a cron job. Failures are swallowed — a sweep that could not run
 * must never break the signup it was riding along with; the next request retries.
 */
async function sweepExpired(supabase: ReturnType<typeof createServiceClient>) {
  try {
    await supabase.from('onboarding_drafts').delete().lt('updated_at', expiredBefore());
  } catch {
    /* best effort */
  }
}

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

  let body: { token?: unknown; draft?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { token, draft } = body;

  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: 'A valid draft token is required' }, { status: 400 });
  }

  if (!draft || typeof draft !== 'object' || typeof draft.curiosityProfile !== 'string') {
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
    draft: pickDraftFields(
      draft as Record<string, unknown>,
      profileValidation.normalizedText
    ),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sweepExpired(supabase);

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

  // Bound how long a stashed draft can sit waiting to be claimed. Same instant
  // the sweep uses, so a row can never be simultaneously too old to read and too
  // young to delete.
  const { data, error } = await supabase
    .from('onboarding_drafts')
    .select('draft')
    .eq('token', token)
    .gt('updated_at', expiredBefore())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.draft) {
    await supabase.from('onboarding_drafts').delete().eq('token', token);
  }

  await sweepExpired(supabase);

  return NextResponse.json({ draft: data?.draft ?? null });
}
