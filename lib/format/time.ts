/**
 * Timestamp formatting shared by the inbox rows and the message thread.
 *
 * All of these render on the client only — they read the viewer's locale and
 * local midnight, which the server has no way to know.
 */

const MS_PER_DAY = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

/** Whole days between two instants, counted by local calendar day. */
function daysAgo(value: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(value)) / MS_PER_DAY);
}

/** `2:14 PM` */
export function formatMessageTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * The right-aligned stamp on an inbox row. Tightens as the message ages so the
 * column stays narrow: today -> clock, this week -> weekday, older -> date.
 */
export function formatListTimestamp(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const days = daysAgo(date, now);
  if (days <= 0) return formatMessageTime(date);
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The divider between days in a thread. */
export function formatDateSeparator(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  const days = daysAgo(date, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { day: 'numeric', month: 'long' });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}
