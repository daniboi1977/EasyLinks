import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Paths reachable without a session — the auth pages themselves, plus the
// static files Android's WebAPK/TWA installer and Chrome's asset-link
// verifier fetch with no cookies at all (see project memory: Deployment
// Protection was disabled for the same reason in 2026-06-30).
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback'];
const PUBLIC_FILE = /\.(svg|png|ico|webmanifest|js)$/;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/.well-known/') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Also refreshes the session cookie if the access token has expired.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
