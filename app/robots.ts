import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindmate.site';

/**
 * Only the marketing and entry pages are public.
 *
 * Everything under the disallow list already redirects an unauthenticated
 * visitor to /auth/login, so a crawler could not read it anyway — this stops the
 * redirect chains being crawled at all, and keeps private routes out of any
 * index that happens to see a URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/discover', '/connections', '/chat/', '/profile', '/admin/', '/auth/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
