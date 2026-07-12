import OpenAI from 'openai';
import type { AnalyzeResult } from '@/types';
import { PROMPT, parseAiResponse } from './shared';

const MODEL = 'gpt-4o-mini';

export async function analyzeContent(
  content: string,
  isYouTube: boolean,
  apiKey: string,
): Promise<AnalyzeResult> {
  const client = new OpenAI({ apiKey });

  const prompt = isYouTube
    ? PROMPT + '\n\nContent to analyze (YouTube video URL): ' + content
    : PROMPT + '\n\nContent to analyze:\n\n' + content;

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
  });

  return parseAiResponse(completion.choices[0]?.message?.content ?? '');
}

export async function analyzeFile(
  base64: string,
  mimeType: string,
  apiKey: string,
): Promise<AnalyzeResult> {
  // OpenAI's chat API doesn't accept raw PDF bytes the way Gemini/Claude do —
  // documented as a known gap rather than building full parity on day one.
  if (mimeType === 'application/pdf') {
    throw new Error(
      'OpenAI does not support PDF analysis yet. Choose Gemini or Anthropic in Settings for PDF bookmarks.',
    );
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
  });

  return parseAiResponse(completion.choices[0]?.message?.content ?? '');
}
