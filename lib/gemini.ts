import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalyzeResult, ContentType } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const PROMPT = `You are a bookmark tagging assistant. Analyze the provided content and return JSON only.
No markdown, no explanation.

{
  "title": "Short descriptive title (max 80 chars)",
  "summary": "2-sentence summary of the core idea",
  "topics": ["Topic1", "Topic2", "Topic3"]
}

Topics should be reusable across bookmarks (e.g., "Machine Learning", "Housing Policy", "Mental Health") — not one-off descriptions. Return 2-5 topics.`;

export async function analyzeContent(
  content: string,
  type: ContentType
): Promise<AnalyzeResult> {
  let parts;

  if (type === 'youtube') {
    parts = [
      { text: PROMPT + '\n\nContent to analyze (YouTube video URL): ' + content },
    ];
  } else {
    parts = [{ text: PROMPT + '\n\nContent to analyze:\n\n' + content }];
  }

  const result = await model.generateContent(parts);
  return parseGeminiResponse(result.response.text());
}

export async function analyzeFile(
  base64: string,
  mimeType: string,
): Promise<AnalyzeResult> {
  const parts = [
    { text: PROMPT },
    { inlineData: { data: base64, mimeType } },
  ];

  const result = await model.generateContent(parts);
  return parseGeminiResponse(result.response.text());
}

function parseGeminiResponse(raw: string): AnalyzeResult {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned) as AnalyzeResult;
}
