import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Internal only — used to pick a fetch strategy and tweak the Gemini prompt.
// Not persisted or exposed via the API.
type SourceKind = 'article' | 'youtube' | 'social' | 'pdf' | 'image' | 'repo';

export class FetchBlockedError extends Error {
  constructor(url: string) {
    super(`Fetch blocked for ${url} — platform prevents server-side access`);
    this.name = 'FetchBlockedError';
  }
}

const YOUTUBE_RE = /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/;
const REDDIT_RE = /^https?:\/\/(www\.)?reddit\.com\//;
const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]/;
const SOCIAL_HOSTS = new Set(['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com']);

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

let redditToken: { value: string; expiresAt: number } | null = null;

async function getRedditToken(): Promise<string> {
  if (redditToken && Date.now() < redditToken.expiresAt) return redditToken.value;

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new FetchBlockedError('reddit (no credentials)');

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'User-Agent': 'BookmarkApp/1.0 (by /u/personal)',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new FetchBlockedError('reddit (token fetch failed)');
  const json = await res.json();
  redditToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return redditToken.value;
}

async function fetchReddit(url: string): Promise<{ text: string; contentType: SourceKind }> {
  const token = await getRedditToken();

  // Convert to oauth.reddit.com path
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/?$/, '') + '.json';
  const apiUrl = `https://oauth.reddit.com${path}?limit=20`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'BookmarkApp/1.0 (by /u/personal)',
      'Accept': 'application/json',
    },
  }).catch(() => null);

  if (!res || !res.ok) throw new FetchBlockedError(url);

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data) || data.length < 1) throw new FetchBlockedError(url);

  const post = data[0]?.data?.children?.[0]?.data;
  if (!post) throw new FetchBlockedError(url);

  const parts: string[] = [];
  parts.push(`Title: ${post.title ?? ''}`);
  if (post.selftext) parts.push(`Post: ${post.selftext}`);

  const comments: any[] = data[1]?.data?.children ?? [];
  for (const c of comments.slice(0, 20)) {
    const body = c?.data?.body;
    if (body && body !== '[deleted]' && body !== '[removed]') {
      parts.push(`Comment: ${body}`);
    }
  }

  const text = parts.join('\n\n');
  if (text.length < 50) throw new FetchBlockedError(url);

  return { text: text.slice(0, 8000), contentType: 'social' };
}

async function fetchYouTube(url: string): Promise<{ text: string; contentType: SourceKind }> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl).catch(() => null);

  if (!res || !res.ok) {
    return { text: url, contentType: 'youtube' };
  }

  const data = await res.json().catch(() => null);
  if (!data?.title) {
    return { text: url, contentType: 'youtube' };
  }

  const text = `Title: ${data.title}\nChannel: ${data.author_name ?? 'unknown'}\nURL: ${url}`;
  return { text, contentType: 'youtube' };
}

export async function fetchContent(url: string): Promise<{ text: string; contentType: SourceKind }> {
  if (YOUTUBE_RE.test(url)) {
    return fetchYouTube(url);
  }

  if (REDDIT_RE.test(url)) {
    return fetchReddit(url);
  }

  if (GITHUB_RE.test(url)) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookmarkBot/1.0)' },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    const text = article?.textContent?.slice(0, 8000) ?? '';
    return { text, contentType: 'repo' };
  }

  const hostname = getHostname(url);

  if (SOCIAL_HOSTS.has(hostname)) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookmarkBot/1.0)' },
    }).catch(() => null);

    if (!res || !res.ok || res.status === 403 || res.status === 429) {
      throw new FetchBlockedError(url);
    }

    const html = await res.text();
    if (!html || html.length < 200) {
      throw new FetchBlockedError(url);
    }

    const $ = cheerio.load(html);
    $('script, style, nav, header, footer').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    if (!text || text.length < 100) {
      throw new FetchBlockedError(url);
    }

    return { text: text.slice(0, 8000), contentType: 'social' };
  }

  // Article / general web page
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookmarkBot/1.0)' },
  });

  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) throw new FetchBlockedError(url);
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (article?.textContent && article.textContent.length > 100) {
    return { text: article.textContent.slice(0, 8000), contentType: 'article' };
  }

  // Fallback: cheerio body text
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { text: text.slice(0, 8000), contentType: 'article' };
}
