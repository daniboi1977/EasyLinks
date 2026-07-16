import type { AnalyzeResult, AiProvider } from '@/types';
import * as gemini from './gemini';
import * as anthropic from './anthropic';
import * as openai from './openai';
import * as openrouter from './openrouter';
import * as groq from './groq';
import * as mistral from './mistral';
import * as together from './together';
import * as deepseek from './deepseek';
import * as huggingface from './huggingface';

export type { AiProvider };
export const AI_PROVIDERS: AiProvider[] = [
  'gemini',
  'anthropic',
  'openai',
  'openrouter',
  'groq',
  'mistral',
  'together',
  'deepseek',
  'huggingface',
];

export interface ProviderModule {
  analyzeContent(content: string, isYouTube: boolean, apiKey: string): Promise<AnalyzeResult>;
  analyzeFile(base64: string, mimeType: string, apiKey: string): Promise<AnalyzeResult>;
}

const providers: Record<AiProvider, ProviderModule> = {
  gemini,
  anthropic,
  openai,
  openrouter,
  groq,
  mistral,
  together,
  deepseek,
  huggingface,
};

export function getProvider(provider: AiProvider): ProviderModule {
  return providers[provider];
}
