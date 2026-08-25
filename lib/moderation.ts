/**
 * Report categories, shared by the API route and the report dialog.
 *
 * Kept out of the route file because Next only permits handler exports there, and
 * out of the component so the two cannot drift from each other — or from the
 * reports_category_check constraint in migration 010, which this list mirrors.
 */
export const REPORT_CATEGORIES = [
  {
    value: 'harassment',
    label: 'Harassment or abuse',
    hint: 'Threats, insults, persistent unwanted contact',
  },
  {
    value: 'inappropriate',
    label: 'Inappropriate content',
    hint: 'Sexual, violent or graphic messages',
  },
  { value: 'spam', label: 'Spam or advertising', hint: 'Selling, recruiting, or link dumping' },
  { value: 'impersonation', label: 'Impersonation', hint: 'Pretending to be someone else' },
  {
    value: 'safety',
    label: 'Safety concern',
    hint: 'Self-harm, or someone who may be in danger',
  },
  { value: 'other', label: 'Something else', hint: 'Tell us in your own words below' },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['value'];

export const REPORT_CATEGORY_VALUES: readonly string[] = REPORT_CATEGORIES.map(c => c.value);

/** Matches the length cap enforced in app/api/reports/route.ts. */
export const REPORT_DETAILS_MAX_LENGTH = 2000;
