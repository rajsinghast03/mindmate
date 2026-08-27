export const DISPLAY_NAME_MIN_LENGTH = 3;
/** Mirrors `display_name VARCHAR(60)` in migration 001. */
export const DISPLAY_NAME_MAX_LENGTH = 60;

export type DisplayNameValidation = {
  valid: boolean;
  normalizedText: string;
  errors: string[];
};

/**
 * Validates the name shown to other people. This is a shape check on the field,
 * not a claim that the name is the person's legal or real one — the field asks
 * for a first name or nickname and either is fine.
 */
export function validateDisplayName(value: unknown): DisplayNameValidation {
  // Whitespace collapses first so a newline becomes a space rather than being
  // stripped along with the other control characters, which would run the words
  // either side of it together. What remains after that is invisible — zero-width
  // joiners and the like — and would otherwise pad a one-letter name past the
  // minimum, so it goes.
  const normalizedText =
    typeof value === 'string'
      ? value
          .replace(/\s+/g, ' ')
          .replace(/[\p{Cc}\p{Cf}]/gu, '')
          .trim()
      : '';
  const errors: string[] = [];

  if (!normalizedText) {
    errors.push('Please enter a display name or nickname.');
  } else {
    if (normalizedText.length < DISPLAY_NAME_MIN_LENGTH) {
      errors.push(`Please use at least ${DISPLAY_NAME_MIN_LENGTH} characters.`);
    }

    if (normalizedText.length > DISPLAY_NAME_MAX_LENGTH) {
      errors.push(`Please keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`);
    }

    // Punctuation alone clears the length bar ("...") and renders as a name that
    // cannot be read or addressed. One letter or digit is the whole requirement.
    if (!/[\p{L}\p{N}]/u.test(normalizedText)) {
      errors.push('Please include at least one letter or number.');
    }
  }

  return { valid: errors.length === 0, normalizedText, errors };
}
