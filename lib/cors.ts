import { NextRequest, NextResponse } from 'next/server';

// Origins allowed to read responses from these API routes. The Chrome extension
// is unpacked (not published to the Web Store) so its origin's ID varies per
// install; any chrome-extension:// origin is trusted since only Dan's own
// browser has it installed and every request still requires a valid auth token.
const ALLOWED_ORIGINS = [
  'https://easylinks-featherlight.vercel.app',
  'http://localhost:3000',
];

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || origin.startsWith('chrome-extension://');
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
  if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function corsResponse(req: NextRequest, body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...corsHeaders(req), ...(init?.headers ?? {}) },
  });
}

export function corsOptions(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
