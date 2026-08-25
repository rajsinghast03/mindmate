'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMindmate } from '@/context/mindmate-context';
import {
  User,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const {
    userProfile,
    togglePauseDiscovery,
    resetAllData,
    isLoaded,
    isSupabaseMode,
    authUser,
  } = useMindmate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // Deleting clears context state, which re-renders this page through its own
  // "no profile" branch before the navigation lands. Checked above that branch so
  // the page holds a spinner instead of flashing an empty state on the way out.
  if (isDeleting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        <p className="font-serif text-sm text-ink-600">Deleting your data…</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h2 className="font-serif text-2xl font-medium text-ink-950 mb-2">
          No profile found
        </h2>
        <p className="text-xs text-ink-500 mb-6">
          You have not created a Curiosity Profile yet.
        </p>
        <Link
          href="/onboarding/paste"
          className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-6 py-2.5 text-xs font-medium text-paper-50"
        >
          <span>Create Profile</span>
        </Link>
      </div>
    );
  }

  const isPaused = userProfile.visibility === 'paused';

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    setShowDeleteModal(false);
    try {
      await resetAllData();
      // Full load rather than router.push: it tears down the React tree, so there
      // is no intermediate client render at all, and the landing page is rendered
      // against the now-signed-out cookies the DELETE set.
      window.location.assign('/');
    } catch (err) {
      // resetAllData now throws on a failed DELETE, so the row really is still
      // there — come back rather than pretending it worked.
      setDeleteError(
        err instanceof Error ? err.message : 'Could not delete your data. Please try again.'
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-950 mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Discover</span>
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-paper-200 px-3 py-1 text-xs font-semibold text-ink-700 mb-3">
          <User className="h-3.5 w-3.5" />
          <span>Profile & Privacy Control</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink-950">
          Your Mindmate Profile
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600">
          Full data sovereignty. You control what is shared, when you are discoverable, and can wipe your data anytime.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card Summary */}
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card">
          <div className="flex items-start justify-between border-b border-paper-200 pb-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-200 text-ink-950 font-serif text-2xl font-semibold border border-paper-300/80">
                {userProfile.displayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-serif text-2xl font-medium text-ink-950">
                    {userProfile.displayName}
                  </h2>
                  <span className="text-sm text-ink-500 font-sans">{userProfile.age}</span>
                </div>
                <span className="text-xs text-ink-500">{userProfile.cityOrTimezone}</span>
              </div>
            </div>

            <Link
              href="/onboarding/paste"
              className="flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-100 px-3.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-paper-200 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </Link>
          </div>

          <div className="my-5 space-y-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-600">
              Approved Curiosity Profile
            </span>
            <p className="font-serif text-base leading-relaxed text-ink-900 italic bg-paper-100/60 p-4 rounded-xl border border-paper-200">
              &ldquo;{userProfile.curiosityProfile}&rdquo;
            </p>
          </div>
        </div>

        {/* Discovery Visibility Toggle */}
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${isPaused ? 'bg-amber-100 text-amber-700' : 'bg-sage-100 text-sage-700'}`}>
                {isPaused ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-serif text-lg font-medium text-ink-950">
                  Discovery Visibility
                </h3>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  {isPaused
                    ? 'Your profile is currently hidden from new match suggestions. Existing conversations remain active.'
                    : 'Your profile is active and discoverable to resonant minds in the curated pool.'}
                </p>
              </div>
            </div>

            <button
              onClick={togglePauseDiscovery}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                isPaused
                  ? 'bg-sage-500 text-white hover:bg-sage-600'
                  : 'bg-paper-200 text-ink-800 hover:bg-paper-300'
              }`}
            >
              {isPaused ? 'Resume Discovery' : 'Pause Discovery'}
            </button>
          </div>
        </div>

        {/* Privacy Guarantees Box */}
        <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-8 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 border-b border-paper-200 pb-3">
            <Shield className="h-4 w-4 text-sage-500" />
            <span>Privacy Invariants Active</span>
          </div>

          {isSupabaseMode && authUser && (
            <p className="text-xs text-ink-500 pb-2">
              Signed in as <strong>{authUser.email}</strong>
            </p>
          )}

          <div className="space-y-2.5 text-xs text-ink-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-sage-500 shrink-0" />
              <span>Zero access to your external ChatGPT account or chat history.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-sage-500 shrink-0" />
              <span>Unmatched users only see high-level resonance themes, never raw text.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-sage-500 shrink-0" />
              <span>No public indexing or searchable directory feeds.</span>
            </div>
          </div>
        </div>

        {/* Danger Zone / Delete Data */}
        <div className="rounded-3xl border border-red-200 bg-red-50/50 p-6 sm:p-8 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-lg font-medium text-red-950">
                Delete Profile & Reset Data
              </h3>
              <p className="text-xs text-red-700 mt-1">
                Permanently deletes your curiosity profile, match history, and conversation threads.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Data</span>
            </button>
          </div>

          {deleteError && (
            <p className="mt-4 text-xs font-medium text-red-700">{deleteError}</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-paper-300 bg-paper-50 p-6 shadow-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-xl font-medium text-ink-950 mb-2">
              Delete all data?
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed mb-6">
              This action cannot be undone. Your profile, matches, and conversations will be permanently wiped.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-full px-4 py-2 text-xs font-medium text-ink-600 hover:bg-paper-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-600 px-5 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
