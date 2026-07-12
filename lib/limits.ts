// Keeps a single free account from filling Supabase's 500MB free-tier database
// (see project memory: ~4KB/bookmark measured empirically, so 300/user keeps
// room for ~1,600 users before Dan needs to think about upgrading).
// Temporarily lowered to 100 (2026-07-12) — raise back to 300 when the reason for the drop no longer applies.
export const MAX_BOOKMARKS_PER_USER = 100;
