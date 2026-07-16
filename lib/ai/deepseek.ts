import { createOpenAiCompatibleProvider } from './openaiCompatible';

export const { analyzeContent, analyzeFile } = createOpenAiCompatibleProvider({
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  label: 'DeepSeek',
});
