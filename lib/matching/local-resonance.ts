/**
 * The offline resonance generator and its result type.
 *
 * Split out of lib/matching/synthesizer.ts deliberately: this half is pure, has no
 * imports beyond the Profile type, and is used by a 'use client' component
 * (context/mindmate-context.tsx) for local demo mode. The synthesizer half reaches
 * providers and reads server-side config, so it must never enter the browser bundle.
 * Keeping them in one module dragged provider code onto the client.
 */

import { Profile } from '@/types';

export type SynthesizedResonance = {
  explanation: string;
  sharedCuriosity: string;
  sharedQuestion: string;
};

// Fallback generator for realistic, high-quality editorial resonance
export function generateLocalResonance(userProfile: Profile, candidate: Profile): SynthesizedResonance {
  const profileTextA = userProfile.curiosityProfile.toLowerCase();
  const profileTextB = candidate.curiosityProfile.toLowerCase();

  // Determine shared domain or theme
  let sharedCuriosity = 'Deliberate Craft & Deep Conversations';
  let explanation = `You both return to making things thoughtfully, escaping superficial small talk, and noticing the quiet details in everyday life.`;
  let sharedQuestion = `What would you try exploring this year if you knew nobody would judge you for being a complete beginner?`;

  if (profileTextA.includes('sound') || profileTextB.includes('sound') || profileTextB.includes('music') || profileTextA.includes('listening')) {
    sharedCuriosity = 'Acoustic Observation & Sonic Memory';
    explanation = `You both find grounding in deep listening and the way sensory environments shape memory and mood.`;
    sharedQuestion = `What is a specific ambient sound or song that immediately anchors you to a place you miss?`;
  } else if (profileTextA.includes('city') || profileTextB.includes('city') || profileTextA.includes('walk') || profileTextB.includes('urban')) {
    sharedCuriosity = 'Urban Topography & Micro-Histories';
    explanation = `You both appreciate slow wanderings through neighborhoods and dissecting how physical spaces influence human connection.`;
    sharedQuestion = `What is your favorite kind of 'third place' that feels like an antidote to digital fatigue?`;
  } else if (profileTextA.includes('nature') || profileTextB.includes('fungal') || profileTextB.includes('climate') || profileTextA.includes('plants')) {
    sharedCuriosity = 'Ecological Systems & Grounded Living';
    explanation = `You share a passion for hands-on ecological curiosity and finding constructive optimism through natural systems.`;
    sharedQuestion = `What is a small, physical practice you do that helps you stay patient with slow processes?`;
  } else if (profileTextA.includes('game') || profileTextB.includes('game') || profileTextA.includes('system') || profileTextB.includes('play')) {
    sharedCuriosity = 'Complex Systems & Playful Design';
    explanation = `You both enjoy taking complex mental models apart and finding playfulness in structured constraints.`;
    sharedQuestion = `What is a simple rule or game mechanic from your favorite pastimes that you wish applied to daily life?`;
  } else if (profileTextA.includes('photo') || profileTextB.includes('photo') || profileTextA.includes('film') || profileTextB.includes('memory')) {
    sharedCuriosity = 'Material Archives & Impermanence';
    explanation = `You both value tangible artifacts over ephemeral digital feeds and care about preserving unhurried memories.`;
    sharedQuestion = `If you could curate a physical exhibition of only three personal objects, what would one of them be?`;
  } else if (profileTextA.includes('language') || profileTextB.includes('language') || profileTextA.includes('words') || profileTextB.includes('poetry')) {
    sharedCuriosity = 'Nuance in Language & Subtle Emotions';
    explanation = `You both ponder the boundaries of words and value emotional precision in everyday dialogue.`;
    sharedQuestion = `Is there a feeling or experience you’ve had recently that felt completely untranslatable into standard words?`;
  } else if (profileTextA.includes('space') || profileTextB.includes('star') || profileTextA.includes('astronomy') || profileTextB.includes('universe')) {
    sharedCuriosity = 'Cosmic Scale & Childlike Curiosity';
    explanation = `You both stay tuned to the quiet awe of the night sky and the joy of tinkering with things from first principles.`;
    sharedQuestion = `When was the last time a piece of new knowledge made you stop in your tracks from pure wonder?`;
  }

  return {
    explanation,
    sharedCuriosity,
    sharedQuestion,
  };
}
