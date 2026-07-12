import { createClient } from '@/lib/supabase/server';
import type { BookmarkWithTopics } from '@/types';
import BookmarkPageClient from './BookmarkPageClient';

async function getInitialBookmarks(): Promise<BookmarkWithTopics[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      id, url, title, summary, created_at, updated_at,
      bookmark_topics ( topics ( name ) )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load initial bookmarks:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
    topics: (row.bookmark_topics ?? [])
      .map((bt: any) => bt.topics?.name)
      .filter(Boolean) as string[],
  }));
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialBookmarks = await getInitialBookmarks();
  return <BookmarkPageClient initialBookmarks={initialBookmarks} userEmail={user?.email ?? ''} />;
}
