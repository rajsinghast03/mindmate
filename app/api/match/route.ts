import { NextResponse } from 'next/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';
import { SynthesizedResonance, synthesizeMatchResonance } from '@/lib/matching/synthesizer';
import { reRankCandidates } from '@/lib/matching/reranker';
import { generateEmbedding } from '@/lib/matching/embeddings';
import {
  loadMatchState,
  loadViewer,
  viewerAsProfile,
} from '@/lib/matching/match-service';
import { canonicalPair } from '@/lib/supabase/match-mapper';
import { Profile } from '@/types';

/**
 * Resonance synthesis can walk a provider chain (Gemini, then OpenAI) before it gives
 * up, and lib/matching/synthesizer.ts budgets up to TOTAL_BUDGET_MS for that walk.
 * Without headroom here the platform kills the function mid-chain and the fallback
 * never gets to serve a card. This also closes a pre-existing exposure: a single
 * hanging Gemini call already outlived the default function timeout.
 */
export const maxDuration = 60;

/** Curated introductions per user, per the anti-feed principle. */
const SUGGESTION_TARGET = 3;

/** Vector shortlist handed to the re-ranker (ARCHITECTURE.md §2 Stage 2). */
const CANDIDATE_POOL_SIZE = 50;

/** Cosine similarity floor — filters unrelated profiles without being restrictive. */
const SIMILARITY_THRESHOLD = 0.15;

type RpcCandidate = {
  id: string;
  display_name: string;
  age: number;
  city_or_timezone: string;
  iana_timezone: string | null;
  curiosity_profile: string;
  is_demo: boolean;
  created_at: string;
  similarity: number;
};

/**
 * Generate and persist new suggestions for the signed-in user.
 *
 * Resonance text is written once at creation and read back on every later render —
 * never regenerated (ARCHITECTURE.md §2 Stage 5).
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const result = await loadViewer();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { viewer } = result;
  const service = createServiceClient();

  try {
    const existing = await loadMatchState(service, viewer.profileId);
    const suggestedCount = existing.matches.filter((m) => m.status === 'suggested').length;

    // A paused profile keeps its existing threads but takes on no new introductions.
    if (viewer.visibility === 'paused' || suggestedCount >= SUGGESTION_TARGET) {
      return NextResponse.json(existing);
    }

    // Self-heal a profile whose embedding failed at save time.
    let embedding = viewer.embedding;
    if (!embedding) {
      embedding = await generateEmbedding(viewer.curiosityProfile);
      if (embedding) {
        await service
          .from('profiles')
          .update({ profile_embedding: embedding })
          .eq('id', viewer.profileId);
      }
    }

    if (!embedding) {
      return NextResponse.json(
        {
          error:
            'Could not prepare your profile for matching. Set GEMINI_API_KEY (or OPENAI_API_KEY), then try again.',
          code: 'EMBEDDING_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    const { data: rpcRows, error: rpcError } = await service.rpc('match_candidate_profiles', {
      target_profile_id: viewer.profileId,
      query_embedding: embedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: CANDIDATE_POOL_SIZE,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const candidateRows = (rpcRows ?? []) as RpcCandidate[];
    if (!candidateRows.length) {
      return NextResponse.json(existing);
    }

    const candidateProfiles: Profile[] = candidateRows.map((row) => ({
      id: row.id,
      userId: '',
      displayName: row.display_name,
      age: row.age,
      cityOrTimezone: row.city_or_timezone,
      ianaTimezone: row.iana_timezone,
      curiosityProfile: row.curiosity_profile,
      visibility: 'discoverable',
      createdAt: row.created_at,
      updatedAt: row.created_at,
    }));

    const semanticScores = new Map(candidateRows.map((row) => [row.id, row.similarity]));
    const viewerProfile = viewerAsProfile(viewer);

    const ranked = reRankCandidates(
      viewerProfile,
      candidateProfiles,
      new Set(),
      semanticScores
    ).slice(0, SUGGESTION_TARGET - suggestedCount);

    if (!ranked.length) {
      return NextResponse.json(existing);
    }

    const synthesized = (
      await Promise.all(
        ranked.map(async (scored) => ({
          scored,
          resonance: await synthesizeMatchResonance(viewerProfile, scored.candidate),
        }))
      )
    ).filter(
      (entry): entry is { scored: typeof entry.scored; resonance: SynthesizedResonance } =>
        entry.resonance !== null
    );

    // A null resonance means the provider was configured but failed. Skip that
    // candidate rather than persisting the offline template — match text is written
    // once and never regenerated, so a transient 503 would otherwise leave a real
    // pair with a generic explanation forever. They resurface on the next call.
    if (synthesized.length < ranked.length) {
      console.warn(
        `Skipped ${ranked.length - synthesized.length} candidate(s): resonance synthesis failed.`
      );
    }

    if (!synthesized.length) {
      return NextResponse.json(
        {
          ...existing,
          error:
            'Could not write your introductions just now — the AI provider is busy. Try again in a moment.',
          code: 'SYNTHESIS_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    const rows = synthesized.map(({ scored, resonance }) => {
      const [profileAId, profileBId] = canonicalPair(viewer.profileId, scored.candidate.id);
      return {
        profile_a_id: profileAId,
        profile_b_id: profileBId,
        score: scored.score,
        explanation: resonance.explanation,
        shared_curiosity: resonance.sharedCuriosity,
        shared_question: resonance.sharedQuestion,
        status: 'suggested',
      };
    });

    // ignoreDuplicates leans on unique_profile_pair to absorb the rare case where
    // both people generated suggestions for each other at the same instant.
    const { error: insertError } = await service
      .from('matches')
      .upsert(rows, { onConflict: 'profile_a_id,profile_b_id', ignoreDuplicates: true });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(await loadMatchState(service, viewer.profileId));
  } catch (error) {
    console.error('POST /api/match failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute matches' },
      { status: 500 }
    );
  }
}
