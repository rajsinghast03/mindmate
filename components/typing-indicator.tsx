import React from 'react';

/**
 * Sits directly above the composer rather than inside the thread, so it never
 * shifts the message list or fights the scroll anchor.
 */
export function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex animate-fade-in items-center gap-2 px-1 pb-1.5 text-[11px] text-ink-500">
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-ink-400"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      <span aria-live="polite">{name} is typing</span>
    </div>
  );
}
