import type { BookmarkWithTopics } from '@/types';

// Shape returned by the `bookmark_topics ( topics ( name ) )` nested select
// used by the bookmarks list, single-bookmark, and initial-load queries.
export interface BookmarkRow {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  bookmark_topics: { topics: { name: string } | null }[] | null;
}

// Takes `unknown` because supabase-js infers the nested `topics` join as an
// array (it can't tell the FK is one-to-many vs many-to-one without generated
// Database types), while at runtime it's actually a single row or null.
export function mapBookmarkRow(row: unknown): BookmarkWithTopics {
  const r = row as BookmarkRow;
  return {
    id: r.id,
    url: r.url,
    title: r.title,
    summary: r.summary,
    created_at: r.created_at,
    updated_at: r.updated_at,
    topics: (r.bookmark_topics ?? [])
      .map((bt) => bt.topics?.name)
      .filter(Boolean) as string[],
  };
}
