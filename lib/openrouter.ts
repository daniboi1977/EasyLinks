import type { AnalyzeResult, ContentType } from '@/types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TEXT_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

const VISION_MODELS = [
  'qwen/qwen2.5-vl-72b-instruct:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

const PROMPT = `You are a bookmark tagging assistant. Analyze the provided content and return JSON only.
No markdown, no explanation.

{
  "title": "Short descriptive title (max 80 chars)",
  "summary": "2-sentence summary of the core idea",
  "topics": ["Topic1", "Topic2", "Topic3"]
}

Topics should be reusable across bookmarks (e.g., "Machine Learning", "Housing Policy", "Mental Health") — not one-off descriptions. Return 2-5 topics.`;

const MAX_RETRIES = 2;

async function callOpenRouter(
  models: string[],
  content: string | unknown[],
  attempt = 0
): Promise<AnalyzeResult> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      models,
      messages: [{ role: 'user', content }],
    }),
  });

  if (res.status === 429 && attempt < MAX_RETRIES) {
    const body = await res.json().catch(() => null);
    const retryAfter = Math.min(body?.error?.metadata?.retry_after_seconds ?? 5, 20);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return callOpenRouter(models, content, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`OpenRouter request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenRouter returned no content');
  return parseResponse(raw);
}

export async function analyzeContent(
  content: string,
  type: ContentType
): Promise<AnalyzeResult> {
  const text =
    type === 'youtube'
      ? PROMPT + '\n\nContent to analyze (YouTube video info):\n\n' + content
      : PROMPT + '\n\nContent to analyze:\n\n' + content;

  return callOpenRouter(TEXT_MODELS, text);
}

export async function analyzeFile(
  base64: string,
  mimeType: string,
  filename?: string
): Promise<AnalyzeResult> {
  if (mimeType === 'application/pdf') {
    const name = (filename ?? 'document').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    return {
      title: (name || 'Untitled PDF').slice(0, 80),
      summary: 'PDF uploaded — automatic content analysis is unavailable for PDFs on the free tier.',
      topics: ['PDF'],
    };
  }

  return callOpenRouter(VISION_MODELS, [
    { type: 'text', text: PROMPT },
    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
  ]);
}

function parseResponse(raw: string): AnalyzeResult {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned) as AnalyzeResult;
}
