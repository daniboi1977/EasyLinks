import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalyzeResult } from '@/types';
import { PROMPT, parseAiResponse } from './shared';

const MODEL = 'gemini-2.5-flash';

export async function analyzeContent(
  content: string,
  isYouTube: boolean,
  apiKey: string,
): Promise<AnalyzeResult> {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODEL });

  const parts = isYouTube
    ? [{ text: PROMPT + '\n\nContent to analyze (YouTube video URL): ' + content }]
    : [{ text: PROMPT + '\n\nContent to analyze:\n\n' + content }];

  const result = await model.generateContent(parts);
  return parseAiResponse(result.response.text());
}

export async function analyzeFile(
  base64: string,
  mimeType: string,
  apiKey: string,
): Promise<AnalyzeResult> {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODEL });

  const parts = [
    { text: PROMPT },
    { inlineData: { data: base64, mimeType } },
  ];

  const result = await model.generateContent(parts);
  return parseAiResponse(result.response.text());
}
