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
      className={`relative flex items-center justify-center rounded-2xl bg-ink-950 text-paper-50 shadow-soft transition-all duration-300 group-hover:scale-105 group-hover:shadow-card ${box} ${className}`}
    >
      <svg
        width={icon * 0.72}
        height={icon * 0.72}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Left Cerebral / Synapse Arch */}
        <path
          d="M13 10C8.5 13 6 17 6 22C6 27.5 10.5 31 16 31C18.5 31 20.8 29.8 22.2 27.8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Right Cerebral / Synapse Arch */}
        <path
          d="M27 30C31.5 27 34 23 34 18C34 12.5 29.5 9 24 9C21.5 9 19.2 10.2 17.8 12.2"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Neural Synapse Connection Arc */}
        <path
          d="M14 20C16 16 24 16 26 20"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeDasharray="2 2"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Central Luminous Synaptic Spark (Terracotta / Coral Meeting Node) */}
        <circle
          cx="20"
          cy="20"
          r="3.5"
          className="fill-accent-500 animate-pulse"
        />

        {/* Subtle Satellite Neural Pulses */}
        <circle cx="12" cy="15" r="1.25" fill="currentColor" opacity="0.5" />
        <circle cx="28" cy="25" r="1.25" fill="currentColor" opacity="0.5" />
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
