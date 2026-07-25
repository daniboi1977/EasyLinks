import { NextRequest } from 'next/server';
import { safeFetch } from '@/lib/ssrf';
import { getAuthedSupabase } from '@/lib/supabase/api';
import { corsResponse, corsOptions } from '@/lib/cors';
import { isRateLimited } from '@/lib/rateLimit';

export const maxDuration = 15;

const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// share.google's redirector only hands back the real destination (via a 301
// Location header) to a GET request that looks like a real mobile browser tap.
// HEAD never gets a Location header regardless of UA, and any non-browser UA
// (including this app's own honest BookmarkBot string used elsewhere) gets a
// 200 "leaving Google" interstitial page instead — which is a dead end since
// it has no Location to follow. Scoped to this one endpoint; general content
// fetching (lib/fetcher.ts) keeps identifying itself honestly as a bot.
const MOBILE_BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

export async function OPTIONS(req: NextRequest) {
  return corsOptions(req);
}

// Resolves link-wrapper URLs (e.g. share.google links from Google Discover/Search)
// to their final destination by following redirects server-side, so the share
// screen can show and save the real URL instead of the wrapper. Always returns
// 200 with a best-effort URL — falls back to the original on any failure rather
// than surfacing an error, since this is a non-blocking UX nicety.
export async function POST(req: NextRequest) {
  const auth = await getAuthedSupabase(req);
  if (!auth) return corsResponse(req, { error: 'Unauthorized' }, { status: 401 });

  if (isRateLimited(auth.user.id, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return corsResponse(req, { error: 'rate_limited' }, { status: 429 });
  }

  const { url } = (await req.json()) as { url?: string };
  if (!url) return corsResponse(req, { error: 'url required' }, { status: 400 });

  try {
    const res = await safeFetch(url, { method: 'GET', headers: { 'User-Agent': MOBILE_BROWSER_UA } });
    res.body?.cancel().catch(() => {});
    return corsResponse(req, { url: res.url || url });
  } catch (err) {
    console.error('[resolve-share-url]', err);
    return corsResponse(req, { url });
  }
}
