import { NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '@/lib/supabase/api';
import { AI_PROVIDERS, type AiProvider } from '@/lib/ai';

function isValidProvider(provider: string): provider is AiProvider {
  return AI_PROVIDERS.includes(provider as AiProvider);
}

// Marks this provider's saved key as the favorite (tried first). The
// set_favorite_ai_key() Postgres function unsets any previous favorite in the
// same call, so exactly one favorite exists whenever the user has >=1 key.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider } = await params;
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const { error } = await auth.supabase.rpc('set_favorite_ai_key', { p_provider: provider });
  if (error) {
    // no_such_key is raised (SQLSTATE P0002) when the user has no saved key
    // for this provider — shouldn't happen from normal UI use.
    if (error.message.includes('no_such_key')) {
      return NextResponse.json({ error: 'No saved key for this provider' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Removes this provider's saved key (and its Vault secret). If it was the
// favorite and other keys remain, delete_user_ai_key() auto-promotes another.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider } = await params;
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const { error } = await auth.supabase.rpc('delete_user_ai_key', { p_provider: provider });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
