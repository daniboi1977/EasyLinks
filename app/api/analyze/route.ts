import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchContent, FetchBlockedError } from '@/lib/fetcher';
import { getProvider, type AiProvider } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { getAuthedSupabase } from '@/lib/supabase/api';
import { corsResponse, corsOptions } from '@/lib/cors';

export const maxDuration = 60;

export async function OPTIONS() {
  return corsOptions();
}

// Looks up the calling user's configured provider + decrypted API key via the
// get_user_ai_key() Postgres function (a SECURITY DEFINER wrapper around
// Supabase Vault, scoped to auth.uid() — see migration add_ai_key_vault_functions).
// Returns null if the user hasn't configured a key yet.
async function getUserAiKey(supabase: SupabaseClient): Promise<{ provider: AiProvider; apiKey: string } | null> {
  const { data, error } = await supabase.rpc('get_user_ai_key');
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return { provider: row.provider as AiProvider, apiKey: row.api_key as string };
}

export async function POST(req: NextRequest) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return corsResponse({ error: 'Unauthorized' }, { status: 401 });

  const aiKey = await getUserAiKey(auth.supabase);
  if (!aiKey) {
    return corsResponse(
      { error: 'no_ai_key', message: 'Add your own AI key in Settings to use AI tagging.' },
      { status: 403 },
    );
  }
  const provider = getProvider(aiKey.provider);

  try {
    const ct = req.headers.get('content-type') ?? '';

    if (ct.includes('multipart/form-data')) {
      return await handleFileUpload(req, provider, aiKey.apiKey);
    }

    const body = await req.json();
    const { url, pastedText } = body as { url?: string; pastedText?: string };

    let text: string;
    let isYouTube = false;

    if (pastedText) {
      text = pastedText;
    } else if (url) {
      try {
        const fetched = await fetchContent(url);
        text = fetched.text;
        isYouTube = fetched.contentType === 'youtube';
      } catch (err) {
        if (err instanceof FetchBlockedError) {
          return corsResponse({ error: 'blocked', message: err.message }, { status: 422 });
        }
        throw err;
      }
    } else {
      return corsResponse({ error: 'url or pastedText required' }, { status: 400 });
    }

    const result = await provider.analyzeContent(text, isYouTube, aiKey.apiKey);
    return corsResponse(result);
  } catch (err) {
    console.error('[analyze]', err);
    return corsResponse({ error: 'Analysis failed', message: String(err) }, { status: 500 });
  }
}

async function handleFileUpload(
  req: NextRequest,
  provider: ReturnType<typeof getProvider>,
  apiKey: string,
) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return corsResponse({ error: 'No file provided' }, { status: 400 });
  }

  const mimeType = file.type;

  const ext = file.name.split('.').pop() ?? 'bin';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(storagePath, bytes, { contentType: mimeType });

  if (uploadError) {
    return corsResponse({ error: 'Storage upload failed', message: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('files').getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  const base64 = Buffer.from(bytes).toString('base64');
  const result = await provider.analyzeFile(base64, mimeType, apiKey);

  return corsResponse({ ...result, fileUrl });
}
