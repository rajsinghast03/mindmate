'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { REPORT_CATEGORY_LABELS, REPORT_STATUSES } from '@/lib/moderation';
import { ShieldAlert, Loader2, MessageSquare, AlertTriangle, ChevronDown } from 'lucide-react';

type Report = {
  id: string;
  category: string;
  reason: string;
  status: string;
  conversationId: string | null;
  createdAt: string;
  reporter: { id: string; displayName: string | null } | null;
  reported: { id: string; displayName: string | null; totalReports: number };
};

type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderName: string;
  isReported: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-accent-100 text-accent-700',
  reviewed: 'bg-paper-200 text-ink-700',
  actioned: 'bg-sage-100 text-sage-700',
  dismissed: 'bg-paper-200 text-ink-500',
};

export default function AdminReportsPage() {
  const [filter, setFilter] = useState('open');
  const [reports, setReports] = useState<Report[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ThreadMessage[] | 'loading' | 'none'>>({});

  const toggleThread = async (reportId: string) => {
    if (threads[reportId]) {
      setThreads(prev => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
      return;
    }

    setThreads(prev => ({ ...prev, [reportId]: 'loading' }));
    const res = await fetch(`/api/admin/reports/${reportId}/thread`);
    if (!res.ok) {
      setThreads(prev => ({ ...prev, [reportId]: 'none' }));
      return;
    }
    const { messages } = await res.json();
    setThreads(prev => ({ ...prev, [reportId]: messages.length ? messages : 'none' }));
  };

  const load = useCallback(async () => {
    setReports(null);
    const res = await fetch(`/api/admin/reports?status=${filter}`);
    if (res.status === 404) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setReports(data.reports ?? []);
    setCounts(data.counts ?? {});
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  };

  // Same shape a non-admin gets from the API: the queue does not advertise itself.
  if (denied) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-2 font-serif text-2xl font-medium text-ink-950">Page not found</h1>
        <Link href="/discover" className="text-xs text-accent-600 underline-offset-4 hover:underline">
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Moderation</span>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink-950">
          Report queue
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Every report filed from a conversation. Marking one handled is a record for you — it does
          not notify anyone.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {REPORT_STATUSES.map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === status
                ? 'bg-ink-950 text-paper-50'
                : 'border border-paper-300 bg-paper-50 text-ink-600 hover:bg-paper-200'
            }`}
          >
            {status}
            {counts[status] ? ` (${counts[status]})` : ''}
          </button>
        ))}
      </div>

      {reports === null ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-10 text-center shadow-soft">
          <p className="font-serif text-lg text-ink-950">Nothing {filter}.</p>
          <p className="mt-1 text-xs text-ink-500">
            {filter === 'open' ? 'No reports are waiting on you.' : `No ${filter} reports.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map(report => (
            <li
              key={report.id}
              className="rounded-2xl border border-paper-300 bg-paper-50 p-4 shadow-soft sm:p-5"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                    STATUS_STYLES[report.status] ?? STATUS_STYLES.reviewed
                  }`}
                >
                  {report.status}
                </span>
                <span className="rounded-full bg-paper-200 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700">
                  {REPORT_CATEGORY_LABELS[report.category] ?? report.category}
                </span>
                {report.reported.totalReports > 1 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    <AlertTriangle className="h-3 w-3" />
                    {report.reported.totalReports} reports total
                  </span>
                )}
                <time className="ml-auto text-[11px] text-ink-400">
                  {new Date(report.createdAt).toLocaleString()}
                </time>
              </div>

              <p className="font-serif text-base text-ink-950">
                <span className="font-medium">{report.reported.displayName ?? 'Deleted profile'}</span>
                <span className="text-ink-500"> reported by </span>
                <span className="font-medium">
                  {report.reporter?.displayName ?? 'a deleted profile'}
                </span>
              </p>

              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-paper-200 bg-paper-100/60 p-3 text-sm leading-relaxed text-ink-800">
                {report.reason}
              </p>

              {report.conversationId && (
                <>
                  <button
                    onClick={() => toggleThread(report.id)}
                    className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-ink-600 transition-colors hover:text-ink-950"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>{threads[report.id] ? 'Hide' : 'Show'} the conversation</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${threads[report.id] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {threads[report.id] === 'loading' && (
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Loading messages…</span>
                    </div>
                  )}

                  {threads[report.id] === 'none' && (
                    <p className="mt-2 text-[11px] text-ink-500">
                      No messages in this conversation.
                    </p>
                  )}

                  {Array.isArray(threads[report.id]) && (
                    <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-paper-200 bg-paper-100/60 p-3">
                      {(threads[report.id] as ThreadMessage[]).map(msg => (
                        <div key={msg.id} className="text-xs leading-relaxed">
                          <span
                            className={
                              msg.isReported
                                ? 'font-semibold text-accent-700'
                                : 'font-medium text-ink-600'
                            }
                          >
                            {msg.senderName}:
                          </span>{' '}
                          <span className="whitespace-pre-wrap text-ink-800">{msg.body}</span>
                          <span className="ml-1.5 text-[10px] text-ink-400">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <p className="border-t border-paper-200 pt-2 text-[10px] text-ink-400">
                        The reported person&apos;s messages are highlighted.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-paper-200 pt-3">
                {REPORT_STATUSES.filter(s => s !== report.status).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatus(report.id, status)}
                    disabled={busy === report.id}
                    className="flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-100 px-3 py-1.5 text-[11px] font-medium capitalize text-ink-700 transition-colors hover:bg-paper-200 disabled:opacity-60"
                  >
                    {busy === report.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>Mark {status}</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
