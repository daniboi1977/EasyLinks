'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(params.get('next') || '/');
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-zinc-100">
        Log in to EasyLinks
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500 dark:text-zinc-500">
        No account? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
