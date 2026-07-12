// Basic in-memory rate limiter. Only limits requests handled by the same warm
// serverless instance (Vercel may run several in parallel), but that's enough
// to stop a single client from hammering an endpoint like /api/analyze, whose
// file-upload path has no other cost brake.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}
