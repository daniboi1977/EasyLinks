import { createOpenAiCompatibleProvider } from './openaiCompatible';

export const { analyzeContent, analyzeFile } = createOpenAiCompatibleProvider({
  baseURL: 'https://api.together.xyz/v1',
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  label: 'Together AI',
});
