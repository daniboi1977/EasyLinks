import { createOpenAiCompatibleProvider } from './openaiCompatible';

// OpenRouter proxies many vendors' models behind one OpenAI-compatible API.
// gpt-4o-mini is a cheap default that also handles image input.
export const { analyzeContent, analyzeFile } = createOpenAiCompatibleProvider({
  baseURL: 'https://openrouter.ai/api/v1',
  model: 'openai/gpt-4o-mini',
  label: 'OpenRouter',
  supportsVision: true,
});
