import { NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '@/lib/supabase/api';
import { upsertTopics } from '../route';
import { mapBookmarkRow } from '@/lib/bookmarks';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabase } = auth;

  const { id } = await params;
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`id, url, title, summary, created_at, updated_at, bookmark_topics ( topics ( name ) )`)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json(mapBookmarkRow(data));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabase, user } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const { title, summary, topics } = body as { title?: string; summary?: string; topics?: string[] };

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (summary !== undefined) updates.summary = summary;

    const { error: bErr } = await supabase.from('bookmarks').update(updates).eq('id', id);
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    if (topics !== undefined) {
      // Remove existing topic links
      await supabase.from('bookmark_topics').delete().eq('bookmark_id', id);

      if (topics.length > 0) {
        const topicIds = await upsertTopics(supabase, user.id, topics);
        const joinRows = topicIds.map((topic_id) => ({ bookmark_id: id, topic_id }));
        const { error: jErr } = await supabase.from('bookmark_topics').insert(joinRows);
        if (jErr) return NextResponse.json({ error: jErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /bookmarks/[id]]', err);
    return NextResponse.json({ error: 'Something went wrong updating this bookmark. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabase } = auth;

  const { id } = await params;
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
