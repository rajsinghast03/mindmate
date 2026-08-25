'use client';

import { Analytics as VercelAnalytics } from '@vercel/analytics/next';

/**
 * Vercel Web Analytics, with private paths redacted before anything is sent.
 *
 * The default reports the resolved pathname, which for this app would ship
 * conversation UUIDs to a third party on every chat page view — and a
 * conversation id is the credential that identifies a private thread. It also
 * reports the query string, which carries the one-time onboarding draft token on
 * /auth/complete.
 *
 * `beforeSend` runs in the browser before the request leaves, so redacting here
 * means the identifiers never go anywhere. Analytics is cookieless and does not
 * track people between sites, so what remains is a page-view count.
 *
 * Only reports from a Vercel deployment; locally the component is inert.
 */

/** Route segments whose value identifies a specific private thing. */
const REDACT = [
  { pattern: /^\/chat\/[^/]+/, as: '/chat/[id]' },
  { pattern: /^\/admin\/reports\/[^/]+/, as: '/admin/reports/[id]' },
];

export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={event => {
        try {
          const url = new URL(event.url);

          // Strip every query parameter rather than allow-listing: the draft
          // token on /auth/complete and the `next` redirect target are both in
          // there, and neither belongs in an analytics record.
          url.search = '';

          for (const { pattern, as } of REDACT) {
            if (pattern.test(url.pathname)) {
              url.pathname = as;
              break;
            }
          }

          return { ...event, url: url.toString() };
        } catch {
          // A URL we cannot parse is one we cannot redact — drop the event.
          return null;
        }
      }}
    />
  );
}
