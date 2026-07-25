'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookmarkForm from '@/app/components/BookmarkForm';

function extractUrl(text: string | null): string {
  if (!text) return '';
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : text.trim();
}

// Google Discover/Search wrap shared links in a share.google redirect instead
// of handing over the real URL. Only these known wrapper hosts trigger a
// resolve request, so a normal share doesn't pay for an extra round-trip.
function isWrappedShareUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'share.google' || host.endsWith('.share.google');
  } catch {
    return false;
  }
}

function ShareContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  const sharedUrl = params.get('url') || extractUrl(params.get('text')) || '';
  const [resolvedUrl, setResolvedUrl] = useState(sharedUrl);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!isWrappedShareUrl(sharedUrl)) return;
    setResolving(true);
    fetch('/api/resolve-share-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sharedUrl }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.url) setResolvedUrl(data.url);
      })
      .catch(() => {})
      .finally(() => setResolving(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrl]);

  async function handleSubmit(data: {
    url: string;
    title: string;
    summary: string;
    topics: string[];
  }) {
    setError('');
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Save failed');
      return;
    }

    router.push('/');
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900 dark:text-zinc-100">Add Bookmark</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {resolving && <p className="mb-3 text-xs text-gray-500 dark:text-zinc-400">Resolving shared link…</p>}
      <BookmarkForm
        initialValues={{ url: resolvedUrl }}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/')}
      />
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <ShareContent />
    </Suspense>
  );
}
