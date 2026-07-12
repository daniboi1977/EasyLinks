// Blocks server-side requests to private/internal/loopback addresses (SSRF protection).
//
// Why this exists: fetchContent() fetches whatever URL a logged-in user submits.
// Without this check, someone could point the analyzer at http://169.254.169.254/
// (cloud metadata endpoint) or http://192.168.1.1/ and get the server to fetch it
// and hand back the result. This validates both the initial URL and every redirect
// hop, since DNS/redirects are the usual way around a naive "check once" guard.

import dns from 'node:dns/promises';
import net from 'node:net';

export class SSRFBlockedError extends Error {
  constructor(url: string, reason: string) {
    super(`Refusing to fetch ${url}: ${reason}`);
    this.name = 'SSRFBlockedError';
  }
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast/reserved/broadcast
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true; // loopback
  if (lower === '::') return true; // unspecified
  if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — check the embedded IPv4 address
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateOrReservedIPv4(mapped[1]);
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateOrReservedIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateOrReservedIPv6(ip);
  return true; // unrecognized format — fail closed
}

async function assertSafeUrl(urlStr: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new SSRFBlockedError(urlStr, 'invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SSRFBlockedError(urlStr, `protocol ${url.protocol} not allowed`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  if (hostname === 'localhost') {
    throw new SSRFBlockedError(urlStr, 'localhost not allowed');
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new SSRFBlockedError(urlStr, 'resolves to a private/internal address');
    }
    return url;
  }

  let records: { address: string }[];
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new SSRFBlockedError(urlStr, 'could not resolve host');
  }

  if (records.length === 0) {
    throw new SSRFBlockedError(urlStr, 'could not resolve host');
  }

  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new SSRFBlockedError(urlStr, 'resolves to a private/internal address');
    }
  }

  return url;
}

/**
 * Drop-in replacement for fetch() that rejects requests to private/internal/loopback
 * addresses and disallowed protocols. Validates every redirect hop too, since a
 * redirect from a public URL to an internal one would otherwise bypass the check.
 */
export async function safeFetch(urlStr: string, init: RequestInit = {}, maxRedirects = 5): Promise<Response> {
  let currentUrl = urlStr;

  for (let i = 0; i <= maxRedirects; i++) {
    const validated = await assertSafeUrl(currentUrl);
    const res = await fetch(validated, { ...init, redirect: 'manual' });

    if (res.status >= 300 && res.status < 400 && res.headers.has('location')) {
      currentUrl = new URL(res.headers.get('location')!, validated).toString();
      continue;
    }

    return res;
  }

  throw new SSRFBlockedError(urlStr, 'too many redirects');
}
