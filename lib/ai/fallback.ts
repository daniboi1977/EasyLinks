import type { AiProvider } from '@/types';
import { getProvider, type ProviderModule } from './index';

export interface AiKeyRecord {
  provider: AiProvider;
  apiKey: string;
  isFavorite: boolean;
}

// Thrown when every configured key failed. Carries the per-provider errors so
// callers can log what actually went wrong with each one.
export class AllProvidersFailedError extends Error {
  constructor(public readonly attempts: { provider: AiProvider; error: unknown }[]) {
    super('All configured AI providers failed');
  }
}

// Tries each key in order (favorite first, per getUserAiKeys' ordering) and
// returns the first successful result. Any thrown error — bad key, rate limit,
// provider outage — moves on to the next key instead of failing the request.
export async function withAiFallback<T>(
  keys: AiKeyRecord[],
  call: (provider: ProviderModule, apiKey: string) => Promise<T>,
): Promise<T> {
  const attempts: { provider: AiProvider; error: unknown }[] = [];

  for (const key of keys) {
    try {
      return await call(getProvider(key.provider), key.apiKey);
    } catch (err) {
      console.error(`[ai-fallback] ${key.provider} failed`, err);
      attempts.push({ provider: key.provider, error: err });
    }
  }

  throw new AllProvidersFailedError(attempts);
}
