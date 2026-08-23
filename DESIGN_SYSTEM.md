# 🎨 Mindmate Design System & Editorial Visual Guidelines

This document specifies the visual design language, color palette, typography hierarchy, UI components, and aesthetic principles for Mindmate.

---

## 1. Aesthetic Philosophy: Calm Editorial Connection

Mindmate rejects high-dopamine, gamified dating app aesthetics (neon gradients, swipe cards, badges, percentage bars, slot-machine animations). Instead, it adopts the atmosphere of a literary journal, independent magazine, or quiet coffeehouse conversation:

- **Warm Paper Backgrounds:** Soft, natural off-whites evoking tactile book pages.
- **Deep Ink Typography:** High-contrast, deep charcoal and ink blacks for effortless long-form reading.
- **Terracotta / Coral Accent:** Used sparingly for purposeful focus, CTAs, and resonance highlights.
- **Ample Whitespace & Breathing Room:** Generous line heights, deliberate pacing, and zero clutter.
- **Human Resonance Over Fake Numbers:** Replace "94% compatible" with thoughtful editorial paragraphs.

---

## 2. Color Palette & Tokens

```css
:root {
  /* Canvas & Paper Surfaces */
  --color-paper-50: #FAF8F5;   /* Primary page canvas */
  --color-paper-100: #F4EFEA;  /* Subtle card backgrounds & borders */
  --color-paper-200: #EAE3DC;  /* Input borders & divider lines */
  --color-paper-300: #D8CCC0;  /* Disabled borders & subtle outlines */
  
  /* Ink & Typography */
  --color-ink-950: #141413;   /* Headings, high emphasis text */
  --color-ink-800: #2C2B28;   /* Body text, long-form paragraphs */
  --color-ink-600: #68655E;   /* Secondary metadata, captions */
  --color-ink-400: #9E9A90;   /* Placeholders, subtle timestamps */
  
  /* Accent: Terracotta / Warm Coral */
  --color-accent-600: #D4513E; /* Hover & active buttons */
  --color-accent-500: #E05A47; /* Primary CTA button & focus rings */
  --color-accent-100: #FBEEEB; /* Light badge backgrounds & highlight tint */
  
  /* Muted Sage / Nature Accent */
  --color-sage-500: #5C7A68;   /* Connected status, verified indicator */
  --color-sage-100: #EEF4F0;   /* Status tag background */
}
```

---

## 3. Typography Scale & Fonts

- **Display & Headings:** Editorial Serif (e.g. *Newsreader*, *Playfair Display*, or *Fraunces*).
- **Body & Controls:** Refined Clean Sans-Serif (e.g. *Geist Sans*, *Inter*, or *Plus Jakarta Sans*).
- **Code / AI Prompts:** Monospace (e.g. *Geist Mono*, *JetBrains Mono*).

### Hierarchy:
| Level | Font Family | Size / Line-Height | Tracking & Weight | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | Serif | `3.25rem` / `1.15` | `-0.025em`, Medium | Main landing headline |
| **Heading 1** | Serif | `2.25rem` / `1.25` | `-0.02em`, Medium | Page titles, major section headers |
| **Heading 2** | Serif | `1.5rem` / `1.35` | `-0.015em`, Medium | Match card titles, review headers |
| **Heading 3** | Sans | `1.125rem` / `1.4` | `0em`, SemiBold | Card subtitles, modal headings |
| **Body Large** | Sans / Serif | `1.125rem` / `1.65` | `0em`, Normal | Curiosity profile previews & quotes |
| **Body Regular** | Sans | `0.9375rem` / `1.55` | `0em`, Normal | Standard UI labels, descriptions |
| **Caption / Meta** | Sans | `0.8125rem` / `1.4` | `0.01em`, Medium | Timezones, age, dates, badges |

---

## 4. UI Components Specifications

### 4.1 Prompt Copy Box
- Elegant parchment-tinted container with subtle border.
- Displays the exact prompt to run in ChatGPT.
- Prominent "Copy Prompt" button with instant haptic/visual confirmation ("Copied to clipboard").
- Clear indicator explaining privacy safety.

### 4.2 Curiosity Profile Text Editor
- Generous, distraction-free textarea with soft focus ring.
- Live word counter with target indicator (Target: 90–150 words).
- Expandable "Need inspiration?" drawer featuring sample authentic profiles.

### 4.3 Match Discovery Card (Anti-Swipe)
- Displays 1 to 3 curated profiles per session.
- **Header:** Display name (nickname), age, broad city/timezone.
- **Resonance Banner:** Editorial paragraph highlighting shared themes.
- **Shared Curiosity Tag:** Intellectual topic or question that connects both individuals.
- **Suggested Opener:** Curated first question to break the ice.
- **Actions:** Two clear, non-gamified buttons:
  - `I'd like to connect` (Primary Coral Button)
  - `Not for me` (Subtle Text/Ghost Button)

### 4.4 Mutual Chat Window
- Clean, serene message layout.
- Pinned header showing the agreed-upon opening question.
- Explicit unmatch, block, and report options accessible from top-right overflow menu.
- Contact sharing disclaimer ("Mindmate never shares your email or exact location; share only what you feel comfortable with").
