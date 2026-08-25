'use client';

import React, { useState } from 'react';
import { ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { REPORT_CATEGORIES, REPORT_DETAILS_MAX_LENGTH } from '@/lib/moderation';

interface ReportDialogProps {
  profileId: string;
  displayName: string;
  conversationId?: string | null;
  onClose: () => void;
  /** Called after a successful submit, once the dialog has done its work. */
  onDone: (didBlock: boolean) => void;
}

/**
 * Report someone, and optionally block them.
 *
 * Blocking is opt-out rather than opt-in: someone who has just described being
 * harassed should not have to take a second action to make it stop. Unchecking it
 * is there for the case where a report is about content rather than a person.
 */
export function ReportDialog({
  profileId,
  displayName,
  conversationId,
  onClose,
  onDone,
}: ReportDialogProps) {
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      setError('Choose a reason so we know what to look for.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, category, details, conversationId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not file this report.');
      }

      if (alsoBlock) {
        const blockRes = await fetch('/api/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId }),
        });

        // The report landed either way — say so rather than implying nothing
        // happened, but be honest that the block did not.
        if (!blockRes.ok) {
          throw new Error(
            'Your report was filed, but we could not block this person. Try blocking from your profile page.'
          );
        }
      }

      onDone(alsoBlock);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not file this report.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-paper-300 bg-paper-50 p-6 shadow-card">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
          <ShieldAlert className="h-5 w-5" />
        </div>

        <h3 className="mb-1 font-serif text-xl font-medium text-ink-950">Report {displayName}</h3>
        <p className="mb-5 text-xs leading-relaxed text-ink-600">
          Our safety team reviews every report. {displayName} is never told who reported them.
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-700">
              What happened?
            </legend>
            <div className="space-y-1.5">
              {REPORT_CATEGORIES.map(option => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-2.5 rounded-xl border p-3 transition-colors ${
                    category === option.value
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-paper-300 bg-paper-100/60 hover:bg-paper-200/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={option.value}
                    checked={category === option.value}
                    onChange={() => {
                      setCategory(option.value);
                      setError(null);
                    }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-950">{option.label}</span>
                    <span className="block text-[11px] leading-snug text-ink-500">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label
            htmlFor="report-details"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-700"
          >
            Anything else? <span className="font-normal normal-case text-ink-500">(optional)</span>
          </label>
          <textarea
            id="report-details"
            rows={3}
            value={details}
            maxLength={REPORT_DETAILS_MAX_LENGTH}
            onChange={e => setDetails(e.target.value)}
            placeholder="What happened, in your own words."
            className="mb-4 w-full resize-none rounded-xl border border-paper-300 bg-paper-100/60 p-3 text-sm text-ink-950 placeholder:text-ink-400 focus:border-accent-500 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />

          <label className="mb-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-paper-300 bg-paper-100/60 p-3">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={e => setAlsoBlock(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent-500"
            />
            <span>
              <span className="block text-sm font-medium text-ink-950">
                Also block {displayName}
              </span>
              <span className="block text-[11px] leading-snug text-ink-500">
                Closes this conversation and stops them being suggested to you again. They are not
                notified.
              </span>
            </span>
          </label>

          {error && (
            <div className="mb-4 flex items-start gap-2 text-xs font-medium text-accent-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full px-4 py-2 text-xs font-medium text-ink-600 hover:bg-paper-200 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-accent-700 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-800 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{submitting ? 'Sending…' : 'Submit report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
