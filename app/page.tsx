import { createClient } from '@/lib/supabase/server';
import { mapBookmarkRow } from '@/lib/bookmarks';
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

  return (data ?? []).map(mapBookmarkRow);
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialBookmarks = await getInitialBookmarks();
  return <BookmarkPageClient initialBookmarks={initialBookmarks} userEmail={user?.email ?? ''} />;
}
