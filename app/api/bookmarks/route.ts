import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { corsResponse, corsOptions } from '@/lib/cors';
import type { BookmarkWithTopics } from '@/types';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim();
  const topic = searchParams.get('topic')?.trim();

  let query = supabase
    .from('bookmarks')
    .select(`
      id, url, title, summary, created_at, updated_at,
      bookmark_topics ( topics ( name ) )
    `)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bookmarks: BookmarkWithTopics[] = (data ?? []).map((row: any) => ({
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

  const filtered = topic
    ? bookmarks.filter((b) => b.topics.some((t) => t.toLowerCase() === topic.toLowerCase()))
    : bookmarks;

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, title, summary, topics } = body as {
      url: string;
      title: string;
      summary: string;
      topics: string[];
    };

    const { data: bookmark, error: bErr } = await supabase
      .from('bookmarks')
      .insert({ url, title, summary })
      .select()
      .single();
    if (bErr) return corsResponse({ error: bErr.message }, { status: 500 });

    const topicIds = await upsertTopics(topics);

    if (topicIds.length > 0) {
      const joinRows = topicIds.map((topic_id) => ({ bookmark_id: bookmark.id, topic_id }));
      const { error: jErr } = await supabase.from('bookmark_topics').insert(joinRows);
      if (jErr) return corsResponse({ error: jErr.message }, { status: 500 });
    }

    return corsResponse({ ...bookmark, topics }, { status: 201 });
  } catch (err) {
    console.error('[POST /bookmarks]', err);
    return corsResponse({ error: String(err) }, { status: 500 });
  }
}

export async function upsertTopics(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  const normalized = names.map((n) => n.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));

  const { data, error } = await supabase
    .from('topics')
    .upsert(normalized.map((name) => ({ name })), { onConflict: 'name' })
    .select('id, name');

  if (error) throw error;

  // Return IDs in the same order as input
  return normalized.map((name) => {
    const match = (data ?? []).find((t: any) => t.name === name);
    return match?.id;
  }).filter(Boolean) as string[];
}
