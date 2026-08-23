import { Profile, SampleCuriosityProfile } from '@/types';

export const SAMPLE_PROMPT_TEXT = `Create a short, privacy-safe Curiosity Profile I can use to meet like-minded people. Use only information I explicitly choose to share. Do not include names, employer, exact location, health, money, relationship history, or other identifying details.

Write in first person, 90–130 words. Include: what I keep thinking about, what I want to explore or make, the kind of conversations or experiences I enjoy, and what I hope to find in other people. Make it warm, specific, and human—not like a résumé.`;

export const SAMPLE_INSPIRATIONS: SampleCuriosityProfile[] = [
  {
    title: 'The Analog Craftsman & Slow Software Thinker',
    author: 'Julian',
    age: 29,
    city: 'Edinburgh (GMT)',
    text: `I keep returning to the tension between digital efficiency and physical craft. Lately, I spend evenings binding small hardcover notebooks by hand and wondering how personal computing lost its intimacy. I want to build small, quiet software tools designed to last twenty years rather than monetize attention. I love conversations that wander without urgency—discussing why paper feels grounding, how architecture shapes mood, or sharing unfinished essays. I hope to find people who treat ordinary curiosity seriously and make things for the quiet joy of making.`,
    keyTopics: ['Bookbinding', 'Calm Software', 'Tactile Design', 'Slow Living'],
  },
  {
    title: 'The Bioacoustics Explorer & Audio Storyteller',
    author: 'Elena',
    age: 26,
    city: 'Berlin (CET)',
    text: `My thoughts are occupied by the hidden soundscapes of forests and the way spatial sound alters memory. I recently started taking field recording trips at dawn, capturing how birdsong changes across different microclimates. I want to collaborate on ambient listening sessions or interactive audio essays. I treasure unhurried tea conversations where we can dissect why certain melodies cause physical nostalgia or how cities would feel if sound was prioritized over speed. Looking for curious minds who notice the quiet details most people scroll past.`,
    keyTopics: ['Field Recording', 'Acoustic Ecology', 'Sound Design', 'Deep Listening'],
  },
  {
    title: 'The Urban Cartographer & Micro-Historian',
    author: 'Marcus',
    age: 33,
    city: 'Chicago (CST)',
    text: `I obsess over the invisible layers of cities: forgotten streetcar routes, brick stamps from defunct kilns, and third places that refused to disappear. I’m currently mapping community gardens and writing short dispatches about neighborhood resilience. I crave discussions that jump between sociology, vernacular architecture, and favorite local bakeries. I value people who enjoy walking four miles through an unfamiliar neighborhood just to look at alleyways and talk about how people carve out belonging in dense spaces.`,
    keyTopics: ['Urban Topography', 'Micro-History', 'Third Places', 'Walkable Cities'],
  },
  {
    title: 'The Cognitive Science & Board Game Designer',
    author: 'Priya',
    age: 28,
    city: 'Toronto (EST)',
    text: `I’m fascinated by how constraint breeds playfulness. By day I study how mental models form; by night I prototype cooperative tabletop games where players win through empathy and shared deduction rather than resource hoarding. I love discussing why we tell stories, the philosophy of mathematics, and the strange satisfaction of fixing mechanical watches. I’m seeking collaborators and friends who enjoy dissecting complex systems with warm humor and playful optimism.`,
    keyTopics: ['Game Mechanics', 'Cognitive Framing', 'Mental Models', 'Playful Systems'],
  },
  {
    title: 'The Mycological Forager & Climate Optimist',
    author: 'Soren',
    age: 31,
    city: 'Portland (PST)',
    text: `I spend my autumns looking at fungal networks and thinking about non-hierarchical collaboration in nature. I’m experimenting with growing mycelium-based insulation in my garage while reading speculative solarpunk fiction. I enjoy low-pressure coffee walks, trading ferment recipes, and talking through how communities can adapt practically to ecological shifts without falling into despair. Hoping to connect with gentle, action-oriented thinkers who love learning by getting their hands dirty.`,
    keyTopics: ['Mycology', 'Solarpunk', 'Fermentation', 'Regenerative Ecology'],
  },
  {
    title: 'The Film Photographer & Archive Restorer',
    author: 'Aria',
    age: 27,
    city: 'Melbourne (AEST)',
    text: `I’m preoccupied with impermanence and why physical film negatives retain emotional weight that digital files lack. I spend weekends restoring discarded 1970s slide carousels found at estate sales. I want to curate a communal library of anonymous memories. I cherish late-night discussions about cinema pacing, Japanese aesthetics (wabi-sabi), and the ethics of preserving personal histories. Looking for someone who appreciates slow art and isn’t afraid of contemplative pauses in conversation.`,
    keyTopics: ['Archival Film', 'Memory Preservation', 'Visual Poetry', 'Slow Cinema'],
  },
  {
    title: 'The Computational Linguist & Poetry Reader',
    author: 'Kaelen',
    age: 30,
    city: 'Amsterdam (CET)',
    text: `I wonder where syntax ends and thought begins. I work on translation models while constantly finding untranslatable words in ancient languages that capture hyper-specific feelings. I’m writing short prose poems exploring how digital spaces reshape grief and connection. I love spontaneous museum visits, debating whether metaphors are the basis of all cognition, and sharing obscure poetry books. Seeking thoughtful companions who value emotional precision and nuanced language.`,
    keyTopics: ['Linguistics', 'Untranslatable Words', 'Poetry', 'Metaphor Theory'],
  },
  {
    title: 'The Amateur Astronomer & Hardware Hacker',
    author: 'Tariq',
    age: 34,
    city: 'Austin (CST)',
    text: `My mind is always tilted toward the night sky. I recently built a motorized star tracker using 3D-printed gears and an old microcontroller to photograph deep-sky nebulae from my backyard. I love deep dives into orbital mechanics, open-source hardware, and the existential peace of feeling tiny under the Milky Way. I love conversing with people who retain childlike wonder about the universe and love building things from scratch.`,
    keyTopics: ['Astrophotography', 'Open Hardware', 'Cosmology', 'Stargazing'],
  }
];

export const SEED_PROFILES: Profile[] = SAMPLE_INSPIRATIONS.map((item, index) => ({
  id: `seed-profile-${index + 1}`,
  userId: `seed-user-${index + 1}`,
  displayName: item.author,
  age: item.age,
  cityOrTimezone: item.city,
  curiosityProfile: item.text,
  visibility: 'discoverable',
  curiosityTags: item.keyTopics,
  createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
}));
