import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Per-request Supabase client for Server Components and Route Handlers, running
// as the logged-in user (via their session cookie) so RLS applies normally.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies (e.g. during
            // static rendering) — the proxy handles refreshing the session instead.
          }
        },
      },
    },
  );
}
