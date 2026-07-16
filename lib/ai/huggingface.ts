import { createOpenAiCompatibleProvider } from './openaiCompatible';

// Hugging Face's router picks one of its backing Inference Providers for
// the given model and exposes an OpenAI-compatible chat completions API.
export const { analyzeContent, analyzeFile } = createOpenAiCompatibleProvider({
  baseURL: 'https://router.huggingface.co/v1',
  model: 'meta-llama/Llama-3.3-70B-Instruct',
  label: 'Hugging Face',
});
