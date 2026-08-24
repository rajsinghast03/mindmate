import { NextRequest, NextResponse } from 'next/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';
import { loadMatchState, loadViewer } from '@/lib/matching/match-service';
import {
  CANDIDATE_COLUMNS,
  DbCandidate,
  DbMatch,
  counterpartId,
  dbMatchToMatch,
  isParty,
} from '@/lib/supabase/match-mapper';

type ServiceClient = ReturnType<typeof createServiceClient>;
type Action = 'connect' | 'pass' | 'unmatch';

const ACTIONS: Action[] = ['connect', 'pass', 'unmatch'];

/** Idempotent: conversations.match_id is unique, so a lost race just re-reads. */
async function ensureConversation(service: ServiceClient, matchId: string): Promise<string> {
  const { data: existing } = await service
    .from('conversations')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await service
    .from('conversations')
    .insert({ match_id: matchId })
    .select('id')
    .single();

  if (error) {
    const { data: raced } = await service
      .from('conversations')
      .select('id')
      .eq('match_id', matchId)
      .maybeSingle();
    if (raced) return raced.id;
    throw new Error(error.message);
  }

  return data.id;
}

/**
 * Drive a match through the consent state machine.
 *
 * Every transition is validated here and written with the service role. Clients
 * have no direct UPDATE path — migration 005 removed the policy that let either
 * party set status themselves, which would have made "connected" self-grantable
 * and unlocked messaging without the other person agreeing.
 *
 *   suggested            --connect (either)--> requested (requested_by = actor)
 *   requested            --connect (recipient)--> connected + conversation
 *   requested            --connect (requester)--> no-op, still waiting
 *   suggested|requested  --pass--> passed
 *   connected            --unmatch--> unmatched
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const { id: matchId } = await params;

  let action: Action;
  try {
    const body = await req.json();
    if (!ACTIONS.includes(body?.action)) {
      return NextResponse.json(
        { error: `action must be one of: ${ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }
    action = body.action;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { viewer } = result;
  const service = createServiceClient();

  try {
    const { data: matchRow, error: matchError } = await service
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (matchError) throw new Error(matchError.message);

    // Same response whether it's missing or someone else's — don't confirm existence.
    if (!matchRow || !isParty(matchRow as DbMatch, viewer.profileId)) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const match = matchRow as DbMatch;
    const updates: Record<string, unknown> = {};
    let conversationId: string | null = null;

    if (action === 'connect') {
      if (match.status === 'connected') {
        conversationId = await ensureConversation(service, match.id);
      } else if (match.status === 'suggested') {
        const { data: counterpart } = await service
          .from('profiles')
          .select('is_demo')
          .eq('id', counterpartId(match, viewer.profileId))
          .maybeSingle();

        // Seeded personas accept on the spot so one person can see the whole flow.
        if (counterpart?.is_demo) {
          updates.status = 'connected';
          updates.requested_by_profile_id = viewer.profileId;
        } else {
          updates.status = 'requested';
          updates.requested_by_profile_id = viewer.profileId;
        }
      } else if (match.status === 'requested') {
        if (match.requested_by_profile_id === viewer.profileId) {
          // Already asked; waiting on them. Nothing to change.
        } else {
          updates.status = 'connected';
        }
      } else {
        return NextResponse.json(
          { error: `Cannot connect a match that is ${match.status}` },
          { status: 409 }
        );
      }
    } else if (action === 'pass') {
      if (match.status !== 'suggested' && match.status !== 'requested') {
        return NextResponse.json(
          { error: `Cannot pass a match that is ${match.status}` },
          { status: 409 }
        );
      }
      updates.status = 'passed';
    } else {
      if (match.status !== 'connected') {
        return NextResponse.json(
          { error: `Cannot unmatch a match that is ${match.status}` },
          { status: 409 }
        );
      }
      updates.status = 'unmatched';
    }

    let current = match;

    if (Object.keys(updates).length) {
      const { data: updated, error: updateError } = await service
        .from('matches')
        .update(updates)
        .eq('id', match.id)
        // Guard against a concurrent transition landing between read and write.
        .eq('status', match.status)
        .select('*')
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);
      if (!updated) {
        return NextResponse.json(
          { error: 'This match changed while you were acting on it. Reload and try again.' },
          { status: 409 }
        );
      }
      current = updated as DbMatch;
    }

    if (current.status === 'connected') {
      conversationId = await ensureConversation(service, current.id);
    }

    const { data: candidate } = await service
      .from('profiles')
      .select(CANDIDATE_COLUMNS)
      .eq('id', counterpartId(current, viewer.profileId))
      .maybeSingle();

    return NextResponse.json({
      match: candidate
        ? dbMatchToMatch(current, viewer.profileId, candidate as DbCandidate, conversationId)
        : null,
      ...(await loadMatchState(service, viewer.profileId)),
    });
  } catch (error) {
    console.error(`POST /api/matches/${matchId} failed:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transition failed' },
      { status: 500 }
    );
  }
}
