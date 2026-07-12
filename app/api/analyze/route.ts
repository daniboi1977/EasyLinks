import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchContent, FetchBlockedError } from '@/lib/fetcher';
import { getProvider, type AiProvider } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { getAuthedSupabase } from '@/lib/supabase/api';
import { corsResponse, corsOptions } from '@/lib/cors';
import { isRateLimited } from '@/lib/rateLimit';

export const maxDuration = 60;

// Covers both the JSON-body and file-upload paths through this route — the
// latter has no other cost brake, unlike the AI call itself (billed to the
// user's own key).
const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Must match the "files" bucket's allowed_mime_types / file_size_limit in Supabase
// (see migration restrict_files_bucket) — checked here too so we reject bad
// uploads with a clear error before spending time reading/uploading the file.
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

// The "files" bucket is private; bookmarks store this URL long-term, so we sign
// it for years rather than minutes to avoid needing an on-demand re-sign flow.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

export async function OPTIONS(req: NextRequest) {
  return corsOptions(req);
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
  if (!auth) return corsResponse(req, { error: 'Unauthorized' }, { status: 401 });

  if (isRateLimited(auth.user.id, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return corsResponse(req, { error: 'rate_limited', message: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const aiKey = await getUserAiKey(auth.supabase);
  if (!aiKey) {
    return corsResponse(req,
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
          return corsResponse(req, { error: 'blocked', message: err.message }, { status: 422 });
        }
        throw err;
      }
    } else {
      return corsResponse(req, { error: 'url or pastedText required' }, { status: 400 });
    }

    const result = await provider.analyzeContent(text, isYouTube, aiKey.apiKey);
    return corsResponse(req, result);
  } catch (err) {
    console.error('[analyze]', err);
    return corsResponse(req, { error: 'Analysis failed', message: 'Something went wrong analyzing this content. Please try again.' }, { status: 500 });
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
    return corsResponse(req, { error: 'No file provided' }, { status: 400 });
  }

  const mimeType = file.type;

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return corsResponse(req, { error: 'Unsupported file type', message: `${mimeType || 'unknown'} is not supported.` }, { status: 415 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return corsResponse(req,
      { error: 'File too large', message: `Files must be under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.` },
      { status: 413 },
    );
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(storagePath, bytes, { contentType: mimeType });

  if (uploadError) {
    return corsResponse(req, { error: 'Storage upload failed', message: uploadError.message }, { status: 500 });
  }

  const { data: urlData, error: signError } = await supabase.storage
    .from('files')
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !urlData) {
    return corsResponse(req, { error: 'Storage signing failed', message: signError?.message }, { status: 500 });
  }

  const fileUrl = urlData.signedUrl;

  const base64 = Buffer.from(bytes).toString('base64');
  const result = await provider.analyzeFile(base64, mimeType, apiKey);

  return corsResponse(req, { ...result, fileUrl });
}
