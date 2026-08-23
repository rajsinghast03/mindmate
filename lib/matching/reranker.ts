import { Profile } from '@/types';

// Simple text tokenization for semantic & topic overlap in local mode
function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  // Common stopwords to filter
  const stopwords = new Set([
    'about', 'after', 'again', 'almost', 'also', 'because', 'before', 'being', 'between',
    'both', 'could', 'doing', 'each', 'even', 'every', 'from', 'have', 'having', 'into',
    'just', 'like', 'many', 'more', 'most', 'much', 'only', 'other', 'people', 'some',
    'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'very', 'want', 'what', 'when', 'where', 'which', 'while', 'who', 'will',
    'with', 'would'
  ]);

  return new Set(words.filter(w => !stopwords.has(w)));
}

// Jaccard similarity for keyword/topic semantic proxy
function calculateTopicOverlap(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0.2;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// Conversation style / depth heuristic based on sentence structure and pacing
function calculateStyleSimilarity(textA: string, textB: string): number {
  const avgSentLenA = textA.length / (textA.split(/[.!?]+/).length || 1);
  const avgSentLenB = textB.length / (textB.split(/[.!?]+/).length || 1);
  const diff = Math.abs(avgSentLenA - avgSentLenB);
  return Math.max(0.3, 1 - diff / 150);
}

// Helper to extract UTC offset in hours from string like 'UTC+5:30' or 'UTC-8'
function parseUtcOffset(loc: string): number | null {
  if (!loc) return null;
  if (loc.toLowerCase().includes('async') || loc.toLowerCase().includes('global')) return null;

  const match = loc.match(/UTC([+-])(\d+)(?::(\d+))?/i);
  if (!match) return null;

  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) / 60 : 0;
  return sign * (hours + minutes);
}

// Timezone compatibility heuristic (1.0 for close timezones, 0.9 for async/global)
function calculateTimezoneScore(locA: string, locB: string): number {
  if (!locA || !locB) return 0.8;
  const cleanA = locA.toLowerCase();
  const cleanB = locB.toLowerCase();
  if (cleanA === cleanB) return 1.0;

  // If either user is an async/global thinker
  if (cleanA.includes('async') || cleanB.includes('async') || cleanA.includes('global') || cleanB.includes('global')) {
    return 0.95;
  }

  const offsetA = parseUtcOffset(locA);
  const offsetB = parseUtcOffset(locB);

  if (offsetA !== null && offsetB !== null) {
    const diff = Math.abs(offsetA - offsetB);
    if (diff <= 3) return 1.0;
    if (diff <= 6) return 0.85;
    if (diff <= 9) return 0.75;
    return 0.65;
  }

  // Fallback: Check if timezone acronym matches (e.g. GMT, EST, PST, CET, IST)
  const tzMatchA = locA.match(/\b([A-Z]{3,4})\b/);
  const tzMatchB = locB.match(/\b([A-Z]{3,4})\b/);
  if (tzMatchA && tzMatchB && tzMatchA[1] === tzMatchB[1]) return 0.95;

  return 0.8;
}

export type ScoredCandidate = {
  candidate: Profile;
  score: number;
  semanticScore: number;
  styleScore: number;
  complementaryScore: number;
  timezoneScore: number;
  freshnessScore: number;
};

export function reRankCandidates(
  userProfile: Profile,
  candidates: Profile[],
  passedIds: Set<string> = new Set()
): ScoredCandidate[] {
  const userKeywords = extractKeywords(userProfile.curiosityProfile);

  const eligibleCandidates = candidates.filter(c => {
    if (c.id === userProfile.id) return false;
    if (c.visibility !== 'discoverable') return false;
    if (passedIds.has(c.id)) return false;
    return true;
  });

  const scored: ScoredCandidate[] = eligibleCandidates.map(candidate => {
    const candidateKeywords = extractKeywords(candidate.curiosityProfile);
    
    // 1. Semantic curiosity overlap (0.55 weight)
    const semanticScore = Math.min(1, calculateTopicOverlap(userKeywords, candidateKeywords) * 3.5 + 0.35);

    // 2. Conversation style similarity (0.15 weight)
    const styleScore = calculateStyleSimilarity(userProfile.curiosityProfile, candidate.curiosityProfile);

    // 3. Complementary interests (0.15 weight)
    const tagOverlap = (candidate.curiosityTags || []).some(tag => 
      userProfile.curiosityProfile.toLowerCase().includes(tag.toLowerCase())
    ) ? 0.9 : 0.6;
    const complementaryScore = tagOverlap;

    // 4. Timezone practicality (0.10 weight)
    const timezoneScore = calculateTimezoneScore(userProfile.cityOrTimezone, candidate.cityOrTimezone);

    // 5. Freshness & diversity (0.05 weight)
    const freshnessScore = 0.8 + (Math.sin(candidate.displayName.length) * 0.2);

    // Weighted Formula
    const finalScore = 
      (0.55 * semanticScore) +
      (0.15 * styleScore) +
      (0.15 * complementaryScore) +
      (0.10 * timezoneScore) +
      (0.05 * freshnessScore);

    return {
      candidate,
      score: Number(finalScore.toFixed(3)),
      semanticScore,
      styleScore,
      complementaryScore,
      timezoneScore,
      freshnessScore,
    };
  });

  // Sort descending by score
  return scored.sort((a, b) => b.score - a.score);
}
