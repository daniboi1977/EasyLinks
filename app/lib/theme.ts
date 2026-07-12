// Shared helpers for the light/dark theme toggle. The theme is stored in
// localStorage so it persists across app restarts, and applied by adding or
// removing the 'dark' class on <html> (see app/layout.tsx for the
// no-flash-on-load script that reads the same key on startup).

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.localStorage.setItem(STORAGE_KEY, theme);
}
