import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { dbProfileToProfile, profileToDbInsert } from '@/lib/supabase/profile-mapper';
import { isAdminEmail, isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';
import { validateCuriosityProfile } from '@/lib/validation/curiosity-profile';
import { validateDisplayName } from '@/lib/validation/display-name';
import { generateEmbedding } from '@/lib/matching/embeddings';

async function requestBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ profile: null, mode: 'local' });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Google hands back a display name; onboarding uses it as a prefill so an OAuth
  // signup does not start with an empty name field. Absent for password signups.
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : null;

  return NextResponse.json({
    mode: 'supabase',
    // isAdmin, not the allowlist itself — the client needs to know whether to show
    // the queue link, not who else can open it.
    user: { id: user.id, email: user.email, fullName, isAdmin: isAdminEmail(user.email) },
    profile: data ? dbProfileToProfile(data) : null,
  });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  // Saving a profile now writes its embedding on the service role.
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await requestBody(req);
  if (!body) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  const { displayName, age, cityOrTimezone, curiosityProfile } = body;

  if (!displayName || !age || !cityOrTimezone || !curiosityProfile) {
    return NextResponse.json({ error: 'Missing required profile fields' }, { status: 400 });
  }

  if (Number(age) < 18) {
    return NextResponse.json({ error: 'Must be 18 or older' }, { status: 400 });
  }

  const nameValidation = validateDisplayName(displayName);
  if (!nameValidation.valid) {
    return NextResponse.json({ error: nameValidation.errors[0], code: 'INVALID_DISPLAY_NAME' }, { status: 422 });
  }

  const profileValidation = validateCuriosityProfile(curiosityProfile);
  if (!profileValidation.valid) {
    return NextResponse.json({ error: profileValidation.errors[0], code: 'INVALID_CURIOSITY_PROFILE' }, { status: 422 });
  }

  // Re-embed only when the curiosity text actually changed, so repeated saves of
  // unrelated fields don't burn embedding calls.
  const { data: existing } = await supabase
    .from('profiles')
    .select('curiosity_profile')
    .eq('user_id', user.id)
    .maybeSingle();

  const textChanged =
    !existing || existing.curiosity_profile !== profileValidation.normalizedText;

  const row = profileToDbInsert(user.id, {
    displayName: nameValidation.normalizedText,
    age: Number(age),
    cityOrTimezone: String(cityOrTimezone).trim(),
    ianaTimezone: body.ianaTimezone ? String(body.ianaTimezone) : null,
    curiosityProfile: profileValidation.normalizedText,
  });

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The vector is written with the service role, never the caller's client.
  // Migration 011 takes profile_embedding out of what `authenticated` may write:
  // it is what discovery matches on, so a self-written vector could be crafted to
  // sit close to everyone.
  if (textChanged) {
    await createServiceClient()
      .from('profiles')
      .update({ profile_embedding: await generateEmbedding(profileValidation.normalizedText) })
      .eq('user_id', user.id);
  }

  return NextResponse.json({ profile: dbProfileToProfile(data) });
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  // Saving a profile now writes its embedding on the service role.
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await requestBody(req);
  if (!body) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  const updates: Record<string, unknown> = {};
  // Held aside from `updates` because it goes through the service client below.
  let newEmbedding: number[] | null = null;
  let embeddingChanged = false;

  if (body.displayName !== undefined) {
    const nameValidation = validateDisplayName(body.displayName);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.errors[0], code: 'INVALID_DISPLAY_NAME' }, { status: 422 });
    }
    updates.display_name = nameValidation.normalizedText;
  }
  if (body.age !== undefined) updates.age = Number(body.age);
  if (body.cityOrTimezone !== undefined) updates.city_or_timezone = String(body.cityOrTimezone).trim();
  if (body.ianaTimezone !== undefined) updates.iana_timezone = body.ianaTimezone ? String(body.ianaTimezone) : null;
  if (body.curiosityProfile !== undefined) {
    const profileValidation = validateCuriosityProfile(body.curiosityProfile);
    if (!profileValidation.valid) {
      return NextResponse.json({ error: profileValidation.errors[0], code: 'INVALID_CURIOSITY_PROFILE' }, { status: 422 });
    }
    updates.curiosity_profile = profileValidation.normalizedText;

    const { data: existing } = await supabase
      .from('profiles')
      .select('curiosity_profile')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing || existing.curiosity_profile !== profileValidation.normalizedText) {
      // Null on failure rather than leaving a vector that describes the old text.
      newEmbedding = await generateEmbedding(profileValidation.normalizedText);
      embeddingChanged = true;
    }
  }
  if (body.visibility !== undefined) updates.visibility = body.visibility;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (embeddingChanged) {
    await createServiceClient()
      .from('profiles')
      .update({ profile_embedding: newEmbedding })
      .eq('user_id', user.id);
  }

  return NextResponse.json({ profile: dbProfileToProfile(data) });
}

/**
 * Delete everything, including the account.
 *
 * Previously this removed the `profiles` row and left `auth.users` behind, so
 * "delete all my data" left an account that could still sign in — to an empty
 * app, but still there. Deleting the auth user cascades the rest: profiles
 * references auth.users ON DELETE CASCADE, and matches, conversations, messages,
 * blocks and reports all cascade from profiles in turn.
 *
 * The profile row is removed first so that a failure at that step is reported
 * before the account is destroyed, rather than after.
 *
 * Note this also removes reports filed *about* this person
 * (reports.reported_profile_id cascades). Deletion winning over moderation
 * retention is the defensible default for a product that promises data
 * sovereignty, but it does mean someone can clear reports against them by
 * deleting and re-registering. Changing that is a policy decision, not a bug fix.
 */
export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Deleting the user invalidates its sessions, so the explicit signOut that used
  // to be here is redundant — but it runs first anyway, because a failure to
  // delete the account should not leave the caller still holding a live session
  // for an account whose profile is already gone.
  await supabase.auth.signOut();

  const { error: accountError } = await createServiceClient().auth.admin.deleteUser(user.id);

  if (accountError) {
    // The profile is already gone, so report honestly rather than claiming success:
    // the user's data is deleted but the login still exists.
    return NextResponse.json(
      {
        error:
          'Your profile and conversations were deleted, but the account itself could not be removed. Please contact support.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
