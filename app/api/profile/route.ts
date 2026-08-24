import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbProfileToProfile, profileToDbInsert } from '@/lib/supabase/profile-mapper';
import { isSupabaseConfigured } from '@/lib/config';

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

  return NextResponse.json({
    mode: 'supabase',
    user: { id: user.id, email: user.email },
    profile: data ? dbProfileToProfile(data) : null,
  });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { displayName, age, cityOrTimezone, curiosityProfile } = body;

  if (!displayName || !age || !cityOrTimezone || !curiosityProfile) {
    return NextResponse.json({ error: 'Missing required profile fields' }, { status: 400 });
  }

  if (Number(age) < 18) {
    return NextResponse.json({ error: 'Must be 18 or older' }, { status: 400 });
  }

  if (curiosityProfile.length < 50) {
    return NextResponse.json({ error: 'Curiosity profile too short' }, { status: 400 });
  }

  const row = profileToDbInsert(user.id, {
    displayName: String(displayName).trim(),
    age: Number(age),
    cityOrTimezone: String(cityOrTimezone).trim(),
    ianaTimezone: body.ianaTimezone ? String(body.ianaTimezone) : null,
    curiosityProfile: String(curiosityProfile).trim(),
  });

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: dbProfileToProfile(data) });
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.displayName !== undefined) updates.display_name = String(body.displayName).trim();
  if (body.age !== undefined) updates.age = Number(body.age);
  if (body.cityOrTimezone !== undefined) updates.city_or_timezone = String(body.cityOrTimezone).trim();
  if (body.ianaTimezone !== undefined) updates.iana_timezone = body.ianaTimezone ? String(body.ianaTimezone) : null;
  if (body.curiosityProfile !== undefined) updates.curiosity_profile = String(body.curiosityProfile).trim();
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

  return NextResponse.json({ profile: dbProfileToProfile(data) });
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
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

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
