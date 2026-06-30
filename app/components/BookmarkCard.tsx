'use client';

import type { BookmarkWithTopics } from '@/types';

const BADGE_COLORS: Record<string, string> = {
  article: 'bg-green-100 dark:bg-zinc-800 text-green-700 dark:text-emerald-400',
  youtube: 'bg-red-100 dark:bg-zinc-800 text-red-700 dark:text-red-400',
  social: 'bg-purple-100 dark:bg-zinc-800 text-purple-700 dark:text-purple-400',
  pdf: 'bg-orange-100 dark:bg-zinc-800 text-orange-700 dark:text-orange-400',
  image: 'bg-sky-100 dark:bg-zinc-800 text-sky-700 dark:text-sky-400',
  repo: 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300',
};

interface Props {
  bookmark: BookmarkWithTopics;
  onEdit: (bookmark: BookmarkWithTopics) => void;
  onDelete: (id: string) => void;
}

export default function BookmarkCard({ bookmark, onEdit, onDelete }: Props) {
  const badgeClass = BADGE_COLORS[bookmark.content_type ?? 'article'] ?? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300';

  function handleDelete() {
    if (window.confirm('Delete this bookmark?')) {
      onDelete(bookmark.id);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-semibold text-blue-600 dark:text-zinc-100 hover:underline dark:hover:text-white line-clamp-2"
        >
          {bookmark.title ?? bookmark.url}
        </a>
        {bookmark.content_type && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
            {bookmark.content_type}
          </span>
        )}
      </div>

      {bookmark.summary && (
        <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-3">{bookmark.summary}</p>
      )}

      {bookmark.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {bookmark.topics.map((t) => (
            <span key={t} className="rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-gray-600 dark:text-zinc-400">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onEdit(bookmark)}
          className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-200 underline"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="text-xs text-gray-500 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
