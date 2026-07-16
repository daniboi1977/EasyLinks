import { createOpenAiCompatibleProvider } from './openaiCompatible';

export const { analyzeContent, analyzeFile } = createOpenAiCompatibleProvider({
  baseURL: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile',
  label: 'Groq',
});
