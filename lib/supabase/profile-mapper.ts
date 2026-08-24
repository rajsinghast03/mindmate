import { Profile } from '@/types';

export type DbProfile = {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  city_or_timezone: string;
  iana_timezone: string | null;
  curiosity_profile: string;
  profile_embedding: number[] | null;
  visibility: 'discoverable' | 'paused';
  created_at: string;
  updated_at: string;
};

export function dbProfileToProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    age: row.age,
    cityOrTimezone: row.city_or_timezone,
    ianaTimezone: row.iana_timezone,
    curiosityProfile: row.curiosity_profile,
    profileEmbedding: row.profile_embedding,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function profileToDbInsert(
  userId: string,
  data: {
    displayName: string;
    age: number;
    cityOrTimezone: string;
    ianaTimezone?: string | null;
    curiosityProfile: string;
    visibility?: 'discoverable' | 'paused';
  }
) {
  return {
    user_id: userId,
    display_name: data.displayName,
    age: data.age,
    city_or_timezone: data.cityOrTimezone,
    iana_timezone: data.ianaTimezone ?? null,
    curiosity_profile: data.curiosityProfile,
    visibility: data.visibility ?? 'discoverable',
  };
}
