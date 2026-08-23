import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-paper-300/80 bg-paper-100/50 py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-paper-200">
          <div className="flex items-center gap-3">
            <Logo size="xs" showWordmark={true} />
            <span className="hidden sm:inline text-xs text-ink-400">•</span>
            <p className="text-xs text-ink-500 hidden sm:inline">
              Meet people through the questions they can&apos;t stop asking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-ink-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-sage-500" />
              <span>Zero ChatGPT scraping & zero public feeds</span>
            </div>
            <Link href="/profile" className="hover:text-ink-950 transition-colors">
              Privacy Settings
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-400">
          <p>© {new Date().getFullYear()} Mindmate. Built for quiet minds and deep conversations.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="h-3 w-3 text-accent-500 fill-accent-500 inline" />
            <span>for human resonance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
