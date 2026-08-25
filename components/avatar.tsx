import React from 'react';

/**
 * The initial-in-a-rounded-square block used by the inbox, the chat header and
 * the discovery card. Mindmate has no photos by design, so the initial is the
 * whole avatar — which is why the three call sites had drifted apart before
 * this was extracted.
 */

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<AvatarSize, string> = {
  sm: 'h-9 w-9 rounded-xl text-base',
  md: 'h-11 w-11 rounded-xl text-lg',
  lg: 'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl text-xl sm:text-2xl',
};

interface AvatarProps {
  displayName: string;
  /** Overrides the derived initial when a profile carries one. */
  avatarInitial?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ displayName, avatarInitial, size = 'md', className = '' }: AvatarProps) {
  const initial = (avatarInitial?.trim() || displayName.trim().charAt(0) || '?').toUpperCase();

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center border border-paper-300/80 bg-paper-200 font-serif font-semibold text-ink-950 shadow-sm ${SIZE_MAP[size]} ${className}`}
    >
      {initial}
    </div>
  );
}
