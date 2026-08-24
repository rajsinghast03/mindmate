export const CURIOSITY_PROFILE_MIN_WORDS = 60;
export const CURIOSITY_PROFILE_MAX_WORDS = 180;
export const CURIOSITY_PROFILE_MAX_CHARACTERS = 2000;

export type CuriosityProfileValidation = {
  valid: boolean;
  normalizedText: string;
  wordCount: number;
  errors: string[];
};

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const REPEATED_CHARACTERS_PATTERN = /(.)\1{7,}/u;
const HOME_ROW_LETTERS = new Set('asdfghjkl');

function wordsIn(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
}

/**
 * Validates user-provided text without altering it. This is a quality and
 * privacy check, not a claim that a person's statements are factually true.
 */
export function validateCuriosityProfile(value: unknown): CuriosityProfileValidation {
  const normalizedText = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const words = wordsIn(normalizedText);
  const errors: string[] = [];

  if (!normalizedText) {
    errors.push('Write a short profile about the ideas and questions you keep returning to.');
  }

  if (normalizedText.length > CURIOSITY_PROFILE_MAX_CHARACTERS) {
    errors.push(`Keep your profile under ${CURIOSITY_PROFILE_MAX_CHARACTERS.toLocaleString()} characters.`);
  }

  if (words.length < CURIOSITY_PROFILE_MIN_WORDS) {
    errors.push(`Please write at least ${CURIOSITY_PROFILE_MIN_WORDS} words so we can understand your curiosities.`);
  }

  if (words.length > CURIOSITY_PROFILE_MAX_WORDS) {
    errors.push(`Please keep your profile to ${CURIOSITY_PROFILE_MAX_WORDS} words or fewer.`);
  }

  const letterWords = words.filter((word) => /\p{L}/u.test(word));
  const uniqueWords = new Set(letterWords.map((word) => word.toLocaleLowerCase()));
  if (words.length >= CURIOSITY_PROFILE_MIN_WORDS && (letterWords.length < 20 || uniqueWords.size / letterWords.length < 0.28)) {
    errors.push('This reads as repeated or incomplete text. Add a few specific thoughts in your own words.');
  }

  // Keyboard-smash text can evade vocabulary-ratio checks by varying the
  // order of a handful of keys (for example: "asdf", "fasd", "asdflkj").
  // Require enough distinct letters and reject text overwhelmingly composed
  // of the keyboard's home row when it is long enough to be a profile.
  const lettersOnly = Array.from(normalizedText.toLocaleLowerCase()).filter((char) => /\p{L}/u.test(char));
  const distinctLetters = new Set(lettersOnly);
  const homeRowRatio = lettersOnly.length
    ? lettersOnly.filter((char) => HOME_ROW_LETTERS.has(char)).length / lettersOnly.length
    : 0;
  if (words.length >= CURIOSITY_PROFILE_MIN_WORDS && (distinctLetters.size < 12 || homeRowRatio > 0.68)) {
    errors.push('This looks like random keyboard input. Please describe a few real interests or questions.');
  }

  if (REPEATED_CHARACTERS_PATTERN.test(normalizedText)) {
    errors.push('Please remove repeated characters and write your profile in complete sentences.');
  }

  const nonWhitespaceCharacters = normalizedText.replace(/\s/g, '');
  const symbols = nonWhitespaceCharacters.match(/[^\p{L}\p{N}.,!?;:'’"“”()\-—]/gu) ?? [];
  if (nonWhitespaceCharacters.length > 0 && symbols.length / nonWhitespaceCharacters.length > 0.16) {
    errors.push('Please use plain, conversational text rather than code or symbol-heavy content.');
  }

  if (EMAIL_PATTERN.test(normalizedText) || URL_PATTERN.test(normalizedText) || PHONE_PATTERN.test(normalizedText)) {
    errors.push('For privacy, remove email addresses, links, and phone numbers from your profile.');
  }

  return { valid: errors.length === 0, normalizedText, wordCount: words.length, errors };
}
