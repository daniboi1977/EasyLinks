import type { AnalyzeResult } from '@/types';

// Same instructions sent to whichever provider the user has configured, so
// Gemini/Anthropic/OpenAI all return the same shape.
export const PROMPT = `You are a bookmark tagging assistant. Analyze the provided content and return JSON only.
No markdown, no explanation.

{
  "title": "Short descriptive title (max 80 chars)",
  "summary": "2-sentence summary of the core idea",
  "topics": ["Topic1", "Topic2", "Topic3"]
}

Topics should be reusable across bookmarks (e.g., "Machine Learning", "Housing Policy", "Mental Health") — not one-off descriptions. Return 2-5 topics.`;

// Models sometimes wrap JSON in a ```json code fence even when told not to — strip it before parsing.
export function parseAiResponse(raw: string): AnalyzeResult {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned) as AnalyzeResult;
}
