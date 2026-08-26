import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindmate.site';

/** The pages a signed-out visitor can actually reach and read. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    {
      url: `${SITE_URL}/onboarding/paste`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Linked from Google's OAuth consent screen, so they must stay publicly
    // reachable and un-gated even when the rest of the app is not.
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
