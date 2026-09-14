/**
 * Resolves the relative asset paths stored in the portable core into URLs the
 * host can load.
 *
 * The core holds `brand/photos/x.webp`; only this file knows the app is served
 * from a Pages sub-path. At port time it maps to a bundled asset or a CDN and
 * nothing above it changes.
 */
const BASE = import.meta.env.BASE_URL;

export function assetUrl(path: string): string {
  if (!path) return '';
  // Already absolute (an uploaded photo will be, once storage is wired up).
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}
