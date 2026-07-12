'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { applyTheme, getStoredTheme, type Theme } from '@/app/lib/theme';
import type { AiProvider } from '@/types';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
};

export default function SettingsPage() {
  const [configured, setConfigured] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<AiProvider | null>(null);
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function handleThemeChange(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  useEffect(() => {
    fetch('/api/settings/ai-key')
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) {
          setConfigured(true);
          setCurrentProvider(data.provider);
          setProvider(data.provider);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/settings/ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save key');
        return;
      }
      setConfigured(true);
      setCurrentProvider(provider);
      setApiKey('');
      setMessage('Key saved.');
    } catch {
      setError('Network error while saving key');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/settings/ai-key', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to remove key');
        return;
      }
      setConfigured(false);
      setCurrentProvider(null);
      setApiKey('');
      setMessage('Key removed. AI tagging is now disabled until you add a new one.');
    } catch {
      setError('Network error while removing key');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Settings</h1>
        <Link href="/" className="text-sm text-gray-500 underline dark:text-zinc-500">
          Back to bookmarks
        </Link>
      </div>

      <section className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-zinc-700">
        <h2 className="mb-1 text-sm font-medium text-gray-900 dark:text-zinc-100">Appearance</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-zinc-500">
          Choose how EasyLinks looks. This is saved on this device.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Toggle dark mode"
            onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              theme === 'dark' ? 'bg-blue-600 dark:bg-zinc-200' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform dark:bg-zinc-900 ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-zinc-700">
        <h2 className="mb-1 text-sm font-medium text-gray-900 dark:text-zinc-100">AI key</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-zinc-500">
          Bring your own API key to enable AI title/summary/topic tagging. Without one, bookmark
          saving still works, just without AI analysis.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-zinc-500">Loading…</p>
        ) : (
          <>
            {configured && currentProvider && (
              <p className="mb-4 text-xs text-green-600">
                Currently using {PROVIDER_LABELS[currentProvider]}.
              </p>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as AiProvider)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  API key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={configured ? 'Enter a new key to replace it' : 'Paste your API key'}
                  required
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {configured && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={saving}
                    className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Remove key
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </section>

      <button
        onClick={handleSignOut}
        className="mt-6 self-start text-sm text-gray-500 underline hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"
      >
        Sign out
      </button>
    </div>
  );
}
