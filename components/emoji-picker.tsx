'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';

/**
 * A curated set rather than the full Unicode table.
 *
 * There is no emoji-picker dependency here on purpose — the whole app is
 * hand-rolled Tailwind, and a searchable 1,800-emoji panel is both a megabyte of
 * JavaScript and a louder surface than this product wants. These are the ones
 * that actually turn up in an unhurried conversation about ideas.
 */
const CATEGORIES: { name: string; icon: string; emoji: string[] }[] = [
  {
    name: 'Smileys',
    icon: '☺️',
    emoji: [
      '😊', '😄', '😁', '😅', '😂', '🙂', '😉', '😌',
      '😍', '🥰', '😘', '😗', '🤗', '🤭', '🤔', '🤨',
      '😐', '😑', '😶', '🙄', '😏', '😒', '😔', '😪',
      '😴', '😌', '🥱', '😷', '🤒', '🥳', '🥺', '🥹',
      '😢', '😭', '😤', '😳', '🤯', '😱', '😬', '🫠',
    ],
  },
  {
    name: 'Gestures',
    icon: '👋',
    emoji: [
      '👋', '🤚', '✋', '👌', '🤌', '🤏', '✌️', '🤞',
      '🫰', '🤟', '🤙', '👈', '👉', '👆', '👇', '☝️',
      '👍', '👎', '👏', '🙌', '🫶', '🙏', '💪', '🤝',
    ],
  },
  {
    name: 'Hearts',
    icon: '❤️',
    emoji: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤',
      '🤍', '💖', '💗', '💓', '💞', '💕', '❣️', '💔',
    ],
  },
  {
    name: 'Ideas',
    icon: '💡',
    emoji: [
      '💡', '🧠', '💭', '🗯️', '✨', '🔥', '⭐', '🌟',
      '📚', '📖', '📝', '✍️', '📔', '🔖', '🧩', '🔍',
      '🔬', '🔭', '🧪', '⚗️', '🧭', '⏳', '🕰️', '♟️',
    ],
  },
  {
    name: 'Life',
    icon: '☕',
    emoji: [
      '☕', '🍵', '🫖', '🍶', '🥂', '🍷', '🍺', '🧋',
      '🌱', '🌿', '🍃', '🌸', '🌻', '🌙', '☀️', '🌊',
      '🏔️', '🌍', '🎧', '🎵', '🎸', '🎹', '🎨', '📷',
    ],
  },
  {
    name: 'Signals',
    icon: '🎉',
    emoji: [
      '🎉', '🎊', '👀', '💫', '⚡', '🌈', '☔', '❄️',
      '✅', '❌', '❓', '❗', '💬', '📌', '🔗', '🎯',
    ],
  },
];

interface EmojiPickerProps {
  /** Receives one emoji; the composer decides where it lands. */
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onSelect, disabled = false }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Same handling as the notification bell and the chat overflow menu.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      {open && (
        <div
          role="dialog"
          aria-label="Choose an emoji"
          // Anchored upward: the chat shell is overflow-hidden, so a panel that
          // opens downward is clipped by the composer's own edge.
          className="absolute bottom-full left-0 z-40 mb-2 w-[min(20rem,calc(100vw-1.5rem))] animate-rise-in overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-card"
        >
          <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto p-2">
            {CATEGORIES[category].emoji.map(emoji => (
              <button
                key={emoji}
                type="button"
                // Keeps focus in the textarea, so the caret stays where it was and
                // the blur handler does not fire a spurious typing-stop.
                onMouseDown={e => e.preventDefault()}
                onClick={() => onSelect(emoji)}
                aria-label={emoji}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-paper-200 active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-paper-200 bg-paper-100 px-1.5 py-1">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setCategory(idx)}
                aria-label={cat.name}
                aria-pressed={idx === category}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-colors ${
                  idx === category ? 'bg-paper-300' : 'hover:bg-paper-200'
                }`}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        aria-label="Choose an emoji"
        aria-expanded={open}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(v => !v)}
        className={`flex h-11 w-9 items-center justify-center rounded-2xl transition-colors disabled:opacity-50 ${
          open ? 'text-accent-600' : 'text-ink-500 hover:text-ink-900'
        }`}
      >
        <Smile className="h-5 w-5" />
      </button>
    </div>
  );
}
