import { NextRequest } from 'next/server';
import { createClient as createBearerClient } from '@supabase/supabase-js';
import { createClient as createCookieClient } from './server';

// Used by API routes, which need to authenticate two kinds of callers:
// same-origin browser/TWA requests (session cookie) and the Chrome extension,
// a different origin that can't use cookies and sends a bearer token instead.
export async function getAuthedSupabase(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearerToken) {
    const supabase = createBearerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
    if (error || !user) return null;
    return { supabase, user };
  }

  const supabase = await createCookieClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}
