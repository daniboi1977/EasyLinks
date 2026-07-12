// Keeps a single free account from filling Supabase's 500MB free-tier database
// (see project memory: ~4KB/bookmark measured empirically, so 300/user keeps
// room for ~1,600 users before Dan needs to think about upgrading).
export const MAX_BOOKMARKS_PER_USER = 300;
