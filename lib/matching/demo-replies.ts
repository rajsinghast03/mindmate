/**
 * Canned replies for the seeded demo personas (profiles.is_demo).
 *
 * These exist so a single person can experience a full conversation without a
 * second account. They are only ever sent on behalf of a demo profile — a real
 * user's messages are never generated. The chat UI labels demo personas plainly.
 */
export const DEMO_REPLIES = [
  `That really resonates with me. I was just thinking about how rare it is to find someone who notices that exact subtlety.`,
  `I love how you phrased that. In my experience, once you start looking at it through that lens, you can't unsee it.`,
  `That makes so much sense! It reminds me of why I wanted to start this project in the first place. Tell me more about what got you interested in this.`,
  `Such a great perspective. What's the next thing you're hoping to experiment with around that?`,
];

export function pickDemoReply(): string {
  return DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)];
}
