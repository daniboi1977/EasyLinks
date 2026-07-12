import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthedSupabase } from '@/lib/supabase/api';
import { corsResponse, corsOptions } from '@/lib/cors';
import { MAX_BOOKMARKS_PER_USER } from '@/lib/limits';
import { isHttpUrl } from '@/lib/url';
import { mapBookmarkRow } from '@/lib/bookmarks';
import type { BookmarkWithTopics } from '@/types';

export async function OPTIONS(req: NextRequest) {
  return corsOptions(req);
}

// Escapes characters that are special inside a PostgREST filter value (`,`, `(`, `)`)
// and inside an ILIKE pattern (`%`, `_`), so user-typed search text can't change how
// the query is parsed or match unintended wildcards. Backslash is escaped first so the
// escapes we add below aren't themselves re-escaped.
function escapeForPostgrestFilter(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return corsResponse(req, { error: 'Unauthorized' }, { status: 401 });
  const { supabase } = auth;

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
    const escaped = escapeForPostgrestFilter(search);
    query = query.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bookmarks: BookmarkWithTopics[] = (data ?? []).map(mapBookmarkRow);

  const filtered = topic
    ? bookmarks.filter((b) => b.topics.some((t) => t.toLowerCase() === topic.toLowerCase()))
    : bookmarks;

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return corsResponse(req, { error: 'Unauthorized' }, { status: 401 });
  const { supabase, user } = auth;

  try {
    const body = await req.json();
    const { url, title, summary, topics } = body as {
      url: string;
      title: string;
      summary: string;
      topics: string[];
    };

    if (!isHttpUrl(url)) {
      return corsResponse(req, { error: 'URL must start with http:// or https://' }, { status: 400 });
    }

    const { count, error: countErr } = await supabase
      .from('bookmarks')
      .select('id', { count: 'exact', head: true });
    if (countErr) return corsResponse(req, { error: countErr.message }, { status: 500 });
    if ((count ?? 0) >= MAX_BOOKMARKS_PER_USER) {
      return corsResponse(req,
        { error: `Free accounts are limited to ${MAX_BOOKMARKS_PER_USER} bookmarks.` },
        { status: 403 },
      );
    }

    const { data: bookmark, error: bErr } = await supabase
      .from('bookmarks')
      .insert({ url, title, summary, user_id: user.id })
      .select()
      .single();
    if (bErr) return corsResponse(req, { error: bErr.message }, { status: 500 });

    const topicIds = await upsertTopics(supabase, user.id, topics);

    if (topicIds.length > 0) {
      const joinRows = topicIds.map((topic_id) => ({ bookmark_id: bookmark.id, topic_id }));
      const { error: jErr } = await supabase.from('bookmark_topics').insert(joinRows);
      if (jErr) return corsResponse(req, { error: jErr.message }, { status: 500 });
    }

    return corsResponse(req, { ...bookmark, topics }, { status: 201 });
  } catch (err) {
    console.error('[POST /bookmarks]', err);
    return corsResponse(req, { error: 'Something went wrong saving this bookmark. Please try again.' }, { status: 500 });
  }
}

export async function upsertTopics(
  supabase: SupabaseClient,
  userId: string,
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];

  const normalized = names.map((n) => n.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));

  const { data, error } = await supabase
    .from('topics')
    .upsert(
      normalized.map((name) => ({ name, user_id: userId })),
      { onConflict: 'user_id,name' },
    )
    .select('id, name');

  if (error) throw error;

  // Return IDs in the same order as input
  const rows = (data ?? []) as { id: string; name: string }[];
  return normalized.map((name) => {
    const match = rows.find((t) => t.name === name);
    return match?.id;
  }).filter(Boolean) as string[];
}
