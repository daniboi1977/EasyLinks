'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookmarkForm from '@/app/components/BookmarkForm';
import type { ContentType } from '@/types';

function extractUrl(text: string | null): string {
  if (!text) return '';
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : text.trim();
}

function ShareContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  const sharedUrl = params.get('url') || extractUrl(params.get('text')) || '';

  async function handleSubmit(data: {
    url: string;
    title: string;
    summary: string;
    topics: string[];
    content_type: ContentType;
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
      <BookmarkForm
        initialValues={{ url: sharedUrl }}
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
