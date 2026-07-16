'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { applyTheme, getStoredTheme, type Theme } from '@/app/lib/theme';
import { AI_PROVIDERS } from '@/lib/ai';
import type { AiProvider } from '@/types';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
};

export default function SettingsPage() {
  // Every provider the user has saved a key for, plus which one is the
  // favorite (tried first, with automatic fallback to the others on failure).
  const [keys, setKeys] = useState<{ provider: AiProvider; isFavorite: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  // "Add a new key" form state.
  const [addProvider, setAddProvider] = useState<AiProvider>('gemini');
  const [addApiKey, setAddApiKey] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const [addError, setAddError] = useState('');

  // State for the favorite-toggle / remove buttons on each saved key row.
  const [busyProvider, setBusyProvider] = useState<AiProvider | null>(null);
  const [rowError, setRowError] = useState('');

  const [theme, setTheme] = useState<Theme>('dark');

  // Account email state: shows the signed-in user's current email and lets
  // them request a change. Supabase requires confirming the change via a
  // link emailed to the new address before it actually takes effect.
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  // Password change state. Unlike the email change, this takes effect
  // immediately - no confirmation email, since the user is already proving
  // they're signed in.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentEmail(data.user.email);
    });
  }, []);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailError('');
    setEmailMessage('');

    const supabase = createClient();
    // This does NOT change the email immediately - Supabase sends a
    // confirmation link to the new address (and, depending on the "Secure
    // email change" setting, one to the old address too). The address only
    // updates once the link is clicked.
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/auth/callback` },
    );

    if (error) {
      setEmailError(error.message);
    } else {
      setEmailMessage(
        `Confirmation link sent to ${newEmail}. Click it to finish changing your email.`,
      );
      setNewEmail('');
    }
    setEmailSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMessage('Password updated.');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordSaving(false);
  }

  function handleThemeChange(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  // Re-fetches the saved-keys list from the server. Called after every
  // add/favorite/remove action instead of guessing the new state locally —
  // the server (not the client) decides things like which key auto-becomes
  // the new favorite after a removal, so re-fetching keeps this page correct.
  async function loadKeys() {
    const res = await fetch('/api/settings/ai-keys');
    const data = await res.json();
    setKeys(data.keys ?? []);
  }

  useEffect(() => {
    loadKeys().finally(() => setLoading(false));
  }, []);

  // Providers the user hasn't already saved a key for — offered in the add form.
  const availableProviders = AI_PROVIDERS.filter(
    (p) => !keys.some((k) => k.provider === p),
  );

  // Keep the add-form's selected provider valid as `keys` changes (e.g. right
  // after the initial load, or after adding/removing a key) — without this,
  // the dropdown can *display* a provider that differs from what handleAddKey
  // would actually submit, since the <select> only shows a corrected value
  // rather than updating the underlying state.
  useEffect(() => {
    if (availableProviders.length > 0 && !availableProviders.includes(addProvider)) {
      setAddProvider(availableProviders[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    setAddMessage('');
    try {
      const res = await fetch('/api/settings/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: addProvider, apiKey: addApiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? 'Failed to save key');
        return;
      }
      await loadKeys();
      setAddApiKey('');
      setAddMessage('Key saved.');
    } catch {
      setAddError('Network error while saving key');
    } finally {
      setAdding(false);
    }
  }

  async function handleSetFavorite(provider: AiProvider) {
    setBusyProvider(provider);
    setRowError('');
    try {
      const res = await fetch(`/api/settings/ai-keys/${provider}`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        setRowError(data.error ?? 'Failed to update favorite');
        return;
      }
      await loadKeys();
    } catch {
      setRowError('Network error while updating favorite');
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleRemoveKey(provider: AiProvider) {
    setBusyProvider(provider);
    setRowError('');
    try {
      const res = await fetch(`/api/settings/ai-keys/${provider}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setRowError(data.error ?? 'Failed to remove key');
        return;
      }
      await loadKeys();
    } catch {
      setRowError('Network error while removing key');
    } finally {
      setBusyProvider(null);
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

      <section className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-zinc-700">
        <h2 className="mb-1 text-sm font-medium text-gray-900 dark:text-zinc-100">Account</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-zinc-500">
          Current email: <span className="text-gray-700 dark:text-zinc-300">{currentEmail}</span>
        </p>

        <form onSubmit={handleEmailChange} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              New email address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          {emailMessage && <p className="text-sm text-green-600">{emailMessage}</p>}

          <button
            type="submit"
            disabled={emailSaving}
            className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {emailSaving ? 'Sending…' : 'Update email'}
          </button>
        </form>

        <hr className="my-4 border-gray-200 dark:border-zinc-700" />

        <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter the password above"
              required
              minLength={8}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordMessage && <p className="text-sm text-green-600">{passwordMessage}</p>}

          <button
            type="submit"
            disabled={passwordSaving}
            className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {passwordSaving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-zinc-700">
        <h2 className="mb-1 text-sm font-medium text-gray-900 dark:text-zinc-100">AI keys</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-zinc-500">
          Bring your own API key(s) to enable AI title/summary/topic tagging. The starred
          (favorite) key is tried first — if it fails, the others are tried automatically.
          Without any key, bookmark saving still works, just without AI analysis.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-zinc-500">Loading…</p>
        ) : (
          <>
            {keys.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2">
                {keys.map((key) => (
                  <li
                    key={key.provider}
                    className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetFavorite(key.provider)}
                        disabled={busyProvider !== null || key.isFavorite}
                        title={key.isFavorite ? 'Tried first' : 'Make this the favorite (tried first)'}
                        className={`text-lg leading-none disabled:cursor-default ${
                          key.isFavorite
                            ? 'text-yellow-500'
                            : 'text-gray-300 hover:text-yellow-500 dark:text-zinc-600'
                        }`}
                      >
                        {key.isFavorite ? '★' : '☆'}
                      </button>
                      <span className="text-sm text-gray-700 dark:text-zinc-300">
                        {PROVIDER_LABELS[key.provider]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveKey(key.provider)}
                      disabled={busyProvider !== null}
                      className="text-sm text-gray-500 underline hover:text-red-600 disabled:opacity-50 dark:text-zinc-500"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {rowError && <p className="mb-4 text-sm text-red-600">{rowError}</p>}

            {availableProviders.length > 0 ? (
              <form onSubmit={handleAddKey} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Provider
                  </label>
                  <select
                    value={addProvider}
                    onChange={(e) => setAddProvider(e.target.value as AiProvider)}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {availableProviders.map((p) => (
                      <option key={p} value={p}>
                        {PROVIDER_LABELS[p]}
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
                    value={addApiKey}
                    onChange={(e) => setAddApiKey(e.target.value)}
                    placeholder="Paste your API key"
                    required
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {addError && <p className="text-sm text-red-600">{addError}</p>}
                {addMessage && <p className="text-sm text-green-600">{addMessage}</p>}

                <button
                  type="submit"
                  disabled={adding}
                  className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  {adding ? 'Saving…' : 'Add key'}
                </button>
              </form>
            ) : (
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                All providers are configured. Remove one above to add a different key.
              </p>
            )}
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
