import { NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '@/lib/supabase/api';
import { AI_PROVIDERS, type AiProvider } from '@/lib/ai';

// Whether the user has configured an AI key, and which provider — never the
// key itself. Used by the Settings page to show current state.
export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.supabase
    .from('user_ai_settings')
    .select('provider')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, provider: data.provider });
}

// Saves (or replaces) the user's provider + API key. The key is written straight
// into Supabase Vault by the set_user_ai_key() Postgres function — it is never
// stored in a plain column and this route never echoes it back.
export async function POST(req: NextRequest) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { provider, apiKey } = body as { provider?: string; apiKey?: string };

  if (!provider || !AI_PROVIDERS.includes(provider as AiProvider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }

  const { error } = await auth.supabase.rpc('set_user_ai_key', {
    p_provider: provider,
    p_api_key: apiKey.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await auth.supabase.rpc('delete_user_ai_key');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
