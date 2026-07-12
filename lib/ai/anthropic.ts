import Anthropic from '@anthropic-ai/sdk';
import type { AnalyzeResult } from '@/types';
import { PROMPT, parseAiResponse } from './shared';

// Haiku is Anthropic's cheapest/fastest tier — matches the "Flash"-tier
// model this app already uses for Gemini, since users pay for this themselves.
const MODEL = 'claude-haiku-4-5-20251001';

export async function analyzeContent(
  content: string,
  isYouTube: boolean,
  apiKey: string,
): Promise<AnalyzeResult> {
  const client = new Anthropic({ apiKey });

  const prompt = isYouTube
    ? PROMPT + '\n\nContent to analyze (YouTube video URL): ' + content
    : PROMPT + '\n\nContent to analyze:\n\n' + content;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return parseAiResponse(textFromMessage(message));
}

export async function analyzeFile(
  base64: string,
  mimeType: string,
  apiKey: string,
): Promise<AnalyzeResult> {
  const client = new Anthropic({ apiKey });

  // Claude reads PDFs natively as a "document" block; images use an "image" block.
  const isPdf = mimeType === 'application/pdf';
  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      }
    : {
        type: 'image',
        source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 },
      };

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: PROMPT }] }],
  });

  return parseAiResponse(textFromMessage(message));
}

function textFromMessage(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text response from Anthropic');
  return block.text;
}
