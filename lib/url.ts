// Checks that a URL is safe to store and render as a clickable link.
//
// Why this exists: without this check, a bookmark's "URL" could be a
// javascript:... string. Rendering that as an <a href> would run arbitrary
// script when the link is clicked (self-XSS today; a bigger risk if bookmarks
// are ever shared between users). Restricting to http/https closes that off.
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
