import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Service role key bypasses Row Level Security. This file is only ever imported
// from server-side code (API routes, server components), so it's safe to use
// here — it must never be exposed to the browser (no NEXT_PUBLIC_ prefix).
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
