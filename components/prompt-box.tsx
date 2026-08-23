'use client';

import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import { SAMPLE_PROMPT_TEXT } from '@/data/seed-profiles';

export function PromptBox() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_PROMPT_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 p-6 shadow-soft transition-all">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-accent-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-700 font-mono">
            Privacy-Safe AI Prompt
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://chatgpt.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-950 transition-colors"
          >
            <span>Open ChatGPT</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Prompt Body */}
      <div className="my-4 font-mono text-sm leading-relaxed text-ink-800 bg-paper-100/80 p-4 rounded-xl border border-paper-200 select-all">
        {SAMPLE_PROMPT_TEXT}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck className="h-4 w-4 text-sage-500 shrink-0" />
          <span>We never connect to or read your ChatGPT account.</span>
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all w-full sm:w-auto ${
            copied
              ? 'bg-sage-500 text-white shadow-sm'
              : 'bg-ink-950 text-paper-50 hover:bg-ink-800 hover:shadow-soft active:scale-95'
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy Prompt</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
