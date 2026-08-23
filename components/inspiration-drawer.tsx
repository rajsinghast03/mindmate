'use client';

import React, { useState } from 'react';
import { SAMPLE_INSPIRATIONS } from '@/data/seed-profiles';
import { Lightbulb, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface InspirationDrawerProps {
  onSelectSample?: (text: string) => void;
}

export function InspirationDrawer({ onSelectSample }: InspirationDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleUseSample = (text: string, index: number) => {
    if (onSelectSample) {
      onSelectSample(text);
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-paper-300/80 bg-paper-50 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 sm:px-6 text-left transition-colors hover:bg-paper-100/60 rounded-2xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">
              Need inspiration? Read sample Curiosity Profiles
            </h4>
            <p className="text-xs text-ink-500">
              See how others describe the questions, crafts, and ideas they ponder.
            </p>
          </div>
        </div>

        <div className="text-ink-400">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-paper-200 p-4 sm:p-6 space-y-4 max-h-[480px] overflow-y-auto">
          {SAMPLE_INSPIRATIONS.map((sample, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-paper-200 bg-paper-100/70 p-4 transition-all hover:border-paper-300"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-serif text-base font-medium text-ink-950">
                    {sample.title}
                  </span>
                  <span className="ml-2 text-xs text-ink-500">
                    ({sample.author}, {sample.age}, {sample.city})
                  </span>
                </div>

                {onSelectSample && (
                  <button
                    onClick={() => handleUseSample(sample.text, idx)}
                    className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700 bg-accent-50 hover:bg-accent-100 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Loaded</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Use as starting text</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="font-serif text-sm leading-relaxed text-ink-800 italic bg-paper-50/70 p-3 rounded-lg border border-paper-200/60">
                &ldquo;{sample.text}&rdquo;
              </p>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {sample.keyTopics.map((topic, tIdx) => (
                  <span
                    key={tIdx}
                    className="inline-block rounded-md bg-paper-200/80 px-2 py-0.5 text-[11px] font-medium text-ink-600"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
