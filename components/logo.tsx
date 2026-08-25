"use client";

import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  href?: string;
  /**
   * Extra classes for the wordmark alone. The navbar uses this to drop it below
   * `sm`: at 360px the wordmark is 130px of a 328px budget, which pushed the nav
   * past the viewport for every signed-in user, not just admins.
   */
  wordmarkClassName?: string;
}

const SIZE_MAP = {
  xs: { box: "h-6 w-6", icon: 24, text: "text-base" },
  sm: { box: "h-8 w-8", icon: 32, text: "text-xl" },
  md: { box: "h-10 w-10", icon: 40, text: "text-2xl" },
  lg: { box: "h-14 w-14", icon: 56, text: "text-3xl" },
  xl: { box: "h-20 w-20", icon: 80, text: "text-4xl" },
};

export function LogoMark({
  size = "sm",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const { box, icon } = SIZE_MAP[size];

  return (
    <div
      // rounded-full, not rounded-2xl: that class is a fixed 1rem, which happens to
      // equal 50% on the 32px navbar mark but only 29% on the 56px one — the same
      // logo rendered as a circle in one place and a rounded square in another.
      className={`relative flex items-center justify-center rounded-full bg-ink-950 text-paper-50 shadow-soft transition-all duration-300 group-hover:scale-105 group-hover:shadow-card ${box} ${className}`}
    >
      <svg
        width={icon * 0.75}
        height={icon * 0.75}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Aesthetic Editorial Serif 'M' Lettermark */}
        <path
          d="M8.5 27V9H11.2L18 20.8L24.8 9H27.5V27H24.5V14.2L18.8 24.2H17.2L11.5 14.2V27H8.5Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function Logo({
  size = "sm",
  showWordmark = true,
  className = "",
  href = "/",
  wordmarkClassName = "",
}: LogoProps) {
  const { text } = SIZE_MAP[size];

  const content = (
    <div className={`group flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={`font-serif font-medium tracking-tight leading-none translate-y-[0.10em] text-ink-950 group-hover:text-accent-700 transition-colors ${text} ${wordmarkClassName}`}
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
