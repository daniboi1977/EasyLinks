import OpenAI from 'openai';
import type { AnalyzeResult } from '@/types';
import { PROMPT, parseAiResponse } from './shared';
import type { ProviderModule } from './index';

interface OpenAiCompatibleConfig {
  baseURL: string;
  model: string;
  // Used in the "not supported" error message shown to the user.
  label: string;
  // Whether this model accepts image_url content blocks. None of the
  // providers built on this factory support raw PDF bytes the way
  // Gemini/Anthropic do, so PDF is always rejected regardless of this flag.
  supportsVision?: boolean;
}

// Several providers (OpenRouter, Groq, Mistral, Together AI, DeepSeek,
// Hugging Face) expose an OpenAI-compatible chat completions endpoint, so
// they only differ by base URL, model name, and vision support — one
// implementation covers all of them instead of six near-duplicate files.
export function createOpenAiCompatibleProvider(config: OpenAiCompatibleConfig): ProviderModule {
  async function analyzeContent(
    content: string,
    isYouTube: boolean,
    apiKey: string,
  ): Promise<AnalyzeResult> {
    const client = new OpenAI({ apiKey, baseURL: config.baseURL });

    const prompt = isYouTube
      ? PROMPT + '\n\nContent to analyze (YouTube video URL): ' + content
      : PROMPT + '\n\nContent to analyze:\n\n' + content;

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
    });

    return parseAiResponse(completion.choices[0]?.message?.content ?? '');
  }

  async function analyzeFile(
    base64: string,
    mimeType: string,
    apiKey: string,
  ): Promise<AnalyzeResult> {
    if (!config.supportsVision || mimeType === 'application/pdf') {
      throw new Error(
        `${config.label} does not support file analysis yet. Choose Gemini or Anthropic in Settings for image/PDF bookmarks.`,
      );
    }

    const client = new OpenAI({ apiKey, baseURL: config.baseURL });

    const completion = await client.chat.completions.create({
      model: config.model,
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

  return { analyzeContent, analyzeFile };
}
