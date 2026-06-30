import { supabase } from '@/lib/supabase';
import type { BookmarkWithTopics } from '@/types';
import GraphPageClient from './GraphPageClient';

async function getAllBookmarks(): Promise<BookmarkWithTopics[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      id, url, title, summary, content_type, created_at, updated_at,
      bookmark_topics ( topics ( name ) )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[graph] Failed to load bookmarks:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    content_type: row.content_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
    topics: (row.bookmark_topics ?? [])
      .map((bt: any) => bt.topics?.name)
      .filter(Boolean) as string[],
  }));
}

export default async function GraphPage() {
  const bookmarks = await getAllBookmarks();
  return <GraphPageClient bookmarks={bookmarks} />;
}
