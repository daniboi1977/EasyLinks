import { NextRequest, NextResponse } from 'next/server';
import { fetchContent, FetchBlockedError } from '@/lib/fetcher';
import { analyzeContent, analyzeFile } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { corsResponse, corsOptions } from '@/lib/cors';

export const maxDuration = 60;

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') ?? '';

    if (ct.includes('multipart/form-data')) {
      return await handleFileUpload(req);
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

    const result = await analyzeContent(text, isYouTube);
    return corsResponse(result);
  } catch (err) {
    console.error('[analyze]', err);
    return corsResponse({ error: 'Analysis failed', message: String(err) }, { status: 500 });
  }
}

async function handleFileUpload(req: NextRequest) {
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
  const result = await analyzeFile(base64, mimeType);

  return corsResponse({ ...result, fileUrl });
}
