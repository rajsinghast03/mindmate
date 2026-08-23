'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  href?: string;
}

const SIZE_MAP = {
  xs: { box: 'h-6 w-6', icon: 24, text: 'text-base' },
  sm: { box: 'h-8 w-8', icon: 32, text: 'text-xl' },
  md: { box: 'h-10 w-10', icon: 40, text: 'text-2xl' },
  lg: { box: 'h-14 w-14', icon: 56, text: 'text-3xl' },
  xl: { box: 'h-20 w-20', icon: 80, text: 'text-4xl' },
};

export function LogoMark({
  size = 'sm',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const { box, icon } = SIZE_MAP[size];

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-ink-950 text-paper-50 shadow-sm transition-transform group-hover:scale-105 ${box} ${className}`}
    >
      <svg
        width={icon * 0.75}
        height={icon * 0.75}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* First Thought Orbit (Left Node) */}
        <path
          d="M13.5 9C8.80558 9 5 13.0294 5 18C5 22.9706 8.80558 27 13.5 27C17.2 27 20.3 24.3 21.6 20.5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />

        {/* Second Thought Orbit (Right Node) */}
        <path
          d="M22.5 27C27.1944 27 31 22.9706 31 18C31 13.0294 27.1944 9 22.5 9C18.8 9 15.7 11.7 14.4 15.5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />

        {/* Central Resonance Spark (Terracotta / Coral meeting node) */}
        <circle
          cx="18"
          cy="18"
          r="2.75"
          className="fill-accent-500 animate-pulse"
        />

        {/* Subtle upper and lower resonance bridge accents */}
        <circle cx="18" cy="11.5" r="1" fill="currentColor" opacity="0.4" />
        <circle cx="18" cy="24.5" r="1" fill="currentColor" opacity="0.4" />
      </svg>
    </div>
  );
}

export function Logo({
  size = 'sm',
  showWordmark = true,
  className = '',
  href = '/',
}: LogoProps) {
  const { text } = SIZE_MAP[size];

  const content = (
    <div className={`group flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={`font-serif font-medium tracking-tight text-ink-950 group-hover:text-accent-700 transition-colors ${text}`}
        >
          Mindmate
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
