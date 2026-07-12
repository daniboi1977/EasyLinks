'use client';

import { isHttpUrl } from '@/lib/url';
import type { BookmarkWithTopics } from '@/types';

interface Props {
  bookmark: BookmarkWithTopics;
  onEdit: (bookmark: BookmarkWithTopics) => void;
  onDelete: (id: string) => void;
}

export default function BookmarkCard({ bookmark, onEdit, onDelete }: Props) {
  function handleDelete() {
    if (window.confirm('Delete this bookmark?')) {
      onDelete(bookmark.id);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        {isHttpUrl(bookmark.url) ? (
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-blue-600 dark:text-zinc-100 hover:underline dark:hover:text-white line-clamp-2"
          >
            {bookmark.title ?? bookmark.url}
          </a>
        ) : (
          <span
            title="This bookmark's URL is not a valid http/https link, so it can't be opened."
            className="text-base font-semibold text-gray-400 dark:text-zinc-500 line-clamp-2"
          >
            {bookmark.title ?? bookmark.url}
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
