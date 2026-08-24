import { Profile, SampleCuriosityProfile } from '@/types';
import seedData from './seed-profiles.json';

/**
 * The personas live in seed-profiles.json so that both this module and
 * scripts/seed-demo-profiles.mjs (plain node, no build step) read one source.
 */

export const SAMPLE_PROMPT_TEXT: string = seedData.prompt;

export const SAMPLE_INSPIRATIONS: SampleCuriosityProfile[] = seedData.inspirations;

/**
 * In-memory candidates for local demo mode (no Supabase env vars). With Supabase
 * configured these same personas exist as real rows with real embeddings — see
 * scripts/seed-demo-profiles.mjs — and matching goes through pgvector instead.
 */
export const SEED_PROFILES: Profile[] = SAMPLE_INSPIRATIONS.map((item, index) => ({
  id: `seed-profile-${index + 1}`,
  userId: `seed-user-${index + 1}`,
  displayName: item.author,
  age: item.age,
  cityOrTimezone: item.city,
  ianaTimezone: 'Asia/Kolkata',
  curiosityProfile: item.text,
  visibility: 'discoverable',
  curiosityTags: item.keyTopics,
  createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
}));
