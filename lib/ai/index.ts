import type { AnalyzeResult, AiProvider } from '@/types';
import * as gemini from './gemini';
import * as anthropic from './anthropic';
import * as openai from './openai';

export type { AiProvider };
export const AI_PROVIDERS: AiProvider[] = ['gemini', 'anthropic', 'openai'];

export interface ProviderModule {
  analyzeContent(content: string, isYouTube: boolean, apiKey: string): Promise<AnalyzeResult>;
  analyzeFile(base64: string, mimeType: string, apiKey: string): Promise<AnalyzeResult>;
}

const providers: Record<AiProvider, ProviderModule> = { gemini, anthropic, openai };

export function getProvider(provider: AiProvider): ProviderModule {
  return providers[provider];
}
