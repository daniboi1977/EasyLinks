'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { BookmarkWithTopics } from '@/types';

const KnowledgeGraph = dynamic(() => import('../components/KnowledgeGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-zinc-600">
      Loading graph…
    </div>
  ),
});

export default function GraphPageClient({ bookmarks }: { bookmarks: BookmarkWithTopics[] }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-6 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bookmarks</h1>
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/" className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white">
            List
          </Link>
          <span className="text-gray-900 dark:text-white">Graph</span>
        </nav>
        <p className="ml-auto text-xs text-gray-400 dark:text-zinc-600">
          Click a topic node to filter · Click a bookmark node to open
        </p>
      </header>
      <div className="flex-1 min-h-0">
        <KnowledgeGraph bookmarks={bookmarks} />
      </div>
    </div>
  );
}
