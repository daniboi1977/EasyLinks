import { createOpenAiCompatibleProvider } from './openaiCompatible';

export const { analyzeContent, analyzeFile } = createOpenAiCompatibleProvider({
  baseURL: 'https://api.mistral.ai/v1',
  model: 'mistral-small-latest',
  label: 'Mistral',
});
