import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindmate.site';

/**
 * Set while the site is live but not ready to be found.
 *
 * Server-only on purpose: this file and the metadata in app/layout.tsx are both
 * evaluated on the server, and the flag has no business in the client bundle.
 * Both are module-scope, so this is baked in at build time — clearing the
 * variable needs a redeploy, not just a save in the Vercel dashboard.
 */
const NOINDEX = Boolean(process.env.SITE_NOINDEX);

/**
 * Only the marketing and entry pages are public.
 *
 * Everything under the disallow list already redirects an unauthenticated
 * visitor to /auth/login, so a crawler could not read it anyway — this stops the
 * redirect chains being crawled at all, and keeps private routes out of any
 * index that happens to see a URL.
 */
export default function robots(): MetadataRoute.Robots {
  // Nothing at all while noindexed, and no sitemap line: pointing a crawler at a
  // list of pages while asking it not to crawl is a contradiction it resolves in
  // its own favour. Link previews are unaffected — WhatsApp, Slack and LinkedIn
  // read the Open Graph tags directly and never look at robots.txt.
  if (NOINDEX) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/discover', '/connections', '/chat/', '/profile', '/admin/', '/auth/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
