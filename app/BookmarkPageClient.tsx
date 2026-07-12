'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BookmarkWithTopics } from '@/types';
import { createClient } from '@/lib/supabase/client';
import BookmarkCard from './components/BookmarkCard';
import BookmarkForm from './components/BookmarkForm';
import TopicFilter from './components/TopicFilter';
import SearchBar from './components/SearchBar';

interface Props {
  initialBookmarks: BookmarkWithTopics[];
  userEmail: string;
}

export default function BookmarkPageClient({ initialBookmarks, userEmail }: Props) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkWithTopics[]>(initialBookmarks);
  const [search, setSearch] = useState('');
  // Read the starting topic from the URL (e.g. if the page was reloaded on a
  // filtered view) instead of always starting at "All bookmarks".
  const [selectedTopic, setSelectedTopic] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('topic');
  });
  const [editingBookmark, setEditingBookmark] = useState<BookmarkWithTopics | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Which tab is active on mobile. Always starts on the bookmark list so
  // opening the app doesn't dump you into a long list of topics first.
  const [mobileView, setMobileView] = useState<'bookmarks' | 'topics'>('bookmarks');

  // Selecting a topic used to only update React state, so the URL never
  // changed and the browser never recorded a "back to all topics" step in
  // its history. Clicking Back would then skip straight past this app to
  // whatever page was open before it. Pushing a history entry here, and
  // listening for popstate (the Back button) below, fixes that.
  const selectTopic = useCallback((topic: string | null) => {
    setSelectedTopic(topic);
    const params = new URLSearchParams(window.location.search);
    if (topic) params.set('topic', topic);
    else params.delete('topic');
    const query = params.toString();
    window.history.pushState({ topic }, '', query ? `?${query}` : window.location.pathname);
  }, []);

  useEffect(() => {
    function handlePopState() {
      setSelectedTopic(new URLSearchParams(window.location.search).get('topic'));
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchBookmarks = useCallback(async (s: string, t: string | null) => {
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (t) params.set('topic', t);
    const res = await fetch(`/api/bookmarks?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setBookmarks(data);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks(search, selectedTopic);
  }, [search, selectedTopic, fetchBookmarks]);

  const allTopics = Array.from(
    new Set(bookmarks.flatMap((b) => b.topics))
  ).sort();

  async function handleAdd(data: {
    url: string;
    title: string;
    summary: string;
    topics: string[];
  }) {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowAddForm(false);
      fetchBookmarks(search, selectedTopic);
    }
  }

  async function handleEdit(data: {
    url: string;
    title: string;
    summary: string;
    topics: string[];
  }) {
    if (!editingBookmark) return;
    const res = await fetch(`/api/bookmarks/${editingBookmark.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: data.title, summary: data.summary, topics: data.topics }),
    });
    if (res.ok) {
      setEditingBookmark(null);
      fetchBookmarks(search, selectedTopic);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const showModal = showAddForm || editingBookmark !== null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 md:flex-nowrap">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white shrink-0">Bookmarks</h1>
        {/* On mobile the search bar is given w-full so it always wraps onto
            its own row below the title/add/settings row; on desktop it sits
            inline between them like before. */}
        <div className="order-4 w-full md:order-none md:w-auto md:flex-1 md:max-w-lg">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="order-2 shrink-0 rounded bg-blue-600 dark:bg-zinc-200 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-blue-700 dark:hover:bg-zinc-100 md:order-none"
        >
          + Add
        </button>
        {/* Narrow-screen version: same links as below, shown as compact icons
            instead of the labeled text (there isn't room for both on a phone
            header, and this is what the installed Android app displays). */}
        <div className="order-3 flex shrink-0 items-center gap-1 md:hidden">
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded p-2 text-lg text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            ⚙
          </Link>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="rounded p-2 text-lg text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            ⏻
          </button>
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="text-xs text-gray-500 dark:text-zinc-500">{userEmail}</span>
          <Link
            href="/settings"
            className="rounded px-2 py-1 text-xs text-gray-500 underline hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded px-2 py-1 text-xs text-gray-500 underline hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex gap-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Sidebar */}
        <div className="hidden md:block">
          <TopicFilter topics={allTopics} selected={selectedTopic} onSelect={selectTopic} />
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Mobile tabs: default to the bookmark list, Topics is opt-in */}
          {allTopics.length > 0 && (
            <div className="md:hidden mb-4 flex gap-1 border-b border-gray-200 dark:border-zinc-800">
              <button
                onClick={() => setMobileView('bookmarks')}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  mobileView === 'bookmarks'
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-zinc-500'
                }`}
              >
                Bookmarks
              </button>
              <button
                onClick={() => setMobileView('topics')}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  mobileView === 'topics'
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-zinc-500'
                }`}
              >
                Topics
              </button>
            </div>
          )}

          {allTopics.length > 0 && mobileView === 'topics' ? (
            <div className="md:hidden">
              <TopicFilter
                topics={allTopics}
                selected={selectedTopic}
                onSelect={(t) => {
                  selectTopic(t);
                  setMobileView('bookmarks');
                }}
              />
            </div>
          ) : (
            <>
              {selectedTopic && (
                <div className="md:hidden mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500">
                  Filtering by <span className="font-medium text-gray-900 dark:text-white">{selectedTopic}</span>
                  <button onClick={() => selectTopic(null)} className="underline">clear</button>
                </div>
              )}
              {bookmarks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-zinc-500 py-8 text-center">
                  {search || selectedTopic ? 'No bookmarks match your filter.' : 'No bookmarks yet. Add one above!'}
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {bookmarks.map((b) => (
                    <BookmarkCard
                      key={b.id}
                      bookmark={b}
                      onEdit={setEditingBookmark}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold dark:text-white">
              {editingBookmark ? 'Edit bookmark' : 'Add bookmark'}
            </h2>
            <BookmarkForm
              initialValues={editingBookmark ?? undefined}
              onSubmit={editingBookmark ? handleEdit : handleAdd}
              onCancel={() => {
                setShowAddForm(false);
                setEditingBookmark(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
