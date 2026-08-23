import { NextRequest, NextResponse } from 'next/server';
import { synthesizeMatchResonance } from '@/lib/matching/synthesizer';
import { reRankCandidates } from '@/lib/matching/reranker';
import { SEED_PROFILES } from '@/data/seed-profiles';
import { Profile } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userProfile: Profile = body.userProfile;
    const passedProfileIds: string[] = body.passedProfileIds || [];

    if (!userProfile || !userProfile.curiosityProfile) {
      return NextResponse.json(
        { error: 'userProfile with curiosityProfile is required' },
        { status: 400 }
      );
    }

    const passedSet = new Set(passedProfileIds);
    const candidatePool = SEED_PROFILES.filter(p => !passedSet.has(p.id));

    // Re-rank candidates using multi-factor heuristic
    const scoredCandidates = reRankCandidates(userProfile, candidatePool, passedSet);
    const topCandidates = scoredCandidates.slice(0, 3);

    // Synthesize qualitative resonance for top candidates
    const matchResults = await Promise.all(
      topCandidates.map(async sc => {
        const resonance = await synthesizeMatchResonance(userProfile, sc.candidate);
        return {
          id: `match-${sc.candidate.id}`,
          profileAId: userProfile.id,
          profileBId: sc.candidate.id,
          candidateProfile: sc.candidate,
          score: sc.score,
          explanation: resonance.explanation,
          sharedCuriosity: resonance.sharedCuriosity,
          sharedQuestion: resonance.sharedQuestion,
          status: 'suggested',
          requestedByProfileId: null,
          createdAt: new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({ matches: matchResults });
  } catch (error: any) {
    console.error('API /api/match error:', error);
    return NextResponse.json(
      { error: 'Failed to process match computation', details: error.message },
      { status: 500 }
    );
  }
}
